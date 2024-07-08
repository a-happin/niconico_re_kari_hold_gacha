const STORAGE_KEY = 're_kari_gacha'

/** @type {<T extends Element> (selectors: string) => Promise<T[]>} */
const waitForElement = (selectors) => new Promise ((resolve, reject) => {
  {
    const res = [...  document.querySelectorAll (selectors)]
    if (res.length > 0)
    {
      return resolve (/** @type {any[]} */ (res))
    }
  }

  const observer = new MutationObserver ((mutations, observer) => {
    const res = []
    for (const mutation of mutations)
    {
      if (mutation.type === 'childList')
      {
        for (const node of mutation.addedNodes)
        {
          if (node instanceof Element)
          {
            if (node.matches (selectors))
            {
              res.push (node)
            }
            res.push (... node.querySelectorAll (selectors))
          }
        }
      }
    }

    if (res.length > 0)
    {
      observer.disconnect ()
      resolve (/** @type {any[]} */ (res))
    }
  })
  observer.observe (document, {childList: true, subtree: true})
})

/** @type {<K extends keyof HTMLElementTagNameMap> (tag: K, f: (it: HTMLElementTagNameMap[K]) => unknown) => HTMLElementTagNameMap[K]} */
const createElement = (tag, f) => {
  const it = document.createElement (tag)
  f (it)
  return it
}

const serialize = async (data) => {
  // json -> arrayBuffer
  const arrayBuffer = await new Response (new Blob ([JSON.stringify (data)]).stream ().pipeThrough (new CompressionStream ('deflate-raw'))).arrayBuffer ()

  // arrayBuffer -> string[]
  const view = new Uint8Array (arrayBuffer)
  const len = arrayBuffer.byteLength
  const arr = new Array (len)
  for (let i = 0; i < len; ++ i)
  {
    arr[i] = String.fromCharCode (view[i])
  }

  // string[] -> base64
  return btoa (arr.join (''))
}

/** @type {(str: string) => Promise <any>} */
const deserialize = async (str) => {
  // base64 decode
  const binary_string = atob (str)

  // binary_string -> arrayBuffer
  const len = binary_string.length
  const arrayBuffer = new ArrayBuffer (len)
  const buffer_view = new Uint8Array (arrayBuffer)
  for (let i = 0; i < len; ++ i)
  {
    buffer_view[i] = binary_string.charCodeAt (i)
  }

  // arrayBuffer -> json
  return await new Response (new Blob ([arrayBuffer]).stream ().pipeThrough (new DecompressionStream ('deflate-raw'))).json ()
}

/** @type {() => Promise <{[k in string]: {html: string}} | undefined>} */
const load_gacha_data = async () => {
  const data_str = localStorage.getItem (STORAGE_KEY)
  if (data_str != null)
  {
    return await deserialize (data_str)
  }
}

/** @type {(data: {[k in string]: {html: string}}) => Promise <void>} */
const save_gacha_data = async (data) => {
  localStorage.setItem (STORAGE_KEY, await serialize (data))
}

/** @type {'id' | 'title' | undefined} */
let sort_order = undefined

/** @type {(arr: HTMLLIElement[]) => HTMLLIElement[]} */
const sort_li = (arr) =>
{
  if (sort_order === undefined)
  {
    return arr
  }
  else if (sort_order === 'id')
  {
    return arr.map ((li) => {
      const exec_ = /\/watch_tmp\/[a-z]+(\d+)/.exec (li.firstChild?.['href'] ?? '')
      const id = parseInt (exec_?.[1] ?? '0', 10)
      return {li, id}
    }).sort ((a, b) => a.id - b.id).map ((x) => x.li)
  }
  else if (sort_order === 'title')
  {
    return arr.map ((li) => ({li, title: li.getElementsByTagName ('h2')[0]?.textContent ?? ''})).sort ((a, b) => a.title.localeCompare (b.title)).map ((x) => x.li)
  }
  else
  {
    return arr
  }
}

const sort_gacha_data = () => {
  const ul = document.querySelector ('ul[class*="hold_gacha"]')
  if (ul == null)
  {
    return
  }
  const arr = /** @type {HTMLLIElement[]} */ ([... ul.children])
  ul.replaceChildren (... sort_li (arr))
}

const insert_gacha_data = async () => {
  // 先にロードする
  const storage = await load_gacha_data () ?? {}

  // メタデータ的な
  let div = document.querySelector ('div#hold_gacha_div')
  if (div == null)
  {
    const gacha_button = (await waitForElement (`div.self_center.justify-self_center, div.mt_28px.d_flex.items_center.justify_center`))[0]
    div = gacha_button.insertAdjacentElement ('afterend', createElement ('div', (div) => {
      div.id = 'hold_gacha_div'
      div.style.margin = '16px'
      div.append (createElement ('p', (p) => {}))
      div.append (createElement ('div', (div) => {
        div.style.display = 'flex'
        // div.style = 'display: flex; & > * { margin-left: 4px; }'
        div.append (createElement ('button', (button) => {
          button.textContent = 'ガチャデータを消去する'
          button.style.cursor = 'pointer'
          button.style.borderWidth = '1px'
          button.style.borderRadius = '4px'
          button.style.padding = '4px'
          button.onclick = () => {
            localStorage.removeItem (STORAGE_KEY)
            document.querySelector ('ul[class*="hold_gacha"]')?.remove ()
          }
        }))
        div.append (createElement ('button', (button) => {
          button.textContent = 'id順にソート'
          button.style.cursor = 'pointer'
          button.style.borderWidth = '1px'
          button.style.borderRadius = '4px'
          button.style.padding = '4px'
          button.style.marginLeft = '8px'
          button.onclick = () => {
            sort_order = 'id'
            sort_gacha_data ()
          }
        }))
        div.append (createElement ('button', (button) => {
          button.textContent = 'タイトル順にソート'
          button.style.cursor = 'pointer'
          button.style.borderWidth = '1px'
          button.style.borderRadius = '4px'
          button.style.padding = '4px'
          button.style.marginLeft = '8px'
          button.onclick = () => {
            sort_order = 'title'
            sort_gacha_data ()
          }
        }))
      }))
    }))

    if (div == null)
    {
      console.error (`ガチャ保持: DOMの変更に失敗しました`)
      return
    }
  }
  {
    const p = div.querySelector ('p')
    if (p == null)
    {
      console.error (`ガチャ保持: DOMの変更に失敗しました`)
      return
    }
    p.textContent = `保持した動画数: ${Object.keys (storage).length}`
  }

  // 保持中の動画表示領域
  const ul = document.querySelector ('ul[class*="hold_gacha"]') ?? div.insertAdjacentElement ('afterend', createElement ('ul', (ul) => {
    ul.classList.add (... `d_flex flex-wrap_wrap justify_center gap_16px hold_gacha`.split (' '))
  }))
  if (ul == null)
  {
    console.error (`ガチャ保持: DOMの変更に失敗しました`)
    return
  }

  const arr = Object.values (storage).map ((a) => createElement ('li', (li) => li.insertAdjacentHTML ('beforeend', a.html)))
  ul.replaceChildren (... sort_li (arr))

  await add_new_gacha_data ()
}

const add_new_gacha_data = async () => {
  /** @type {HTMLAnchorElement[]} */
  const new_gacha_elements = await waitForElement (`ul:not([class*="hold_gacha"]) a[href*="/watch_tmp/"]`)
  const storage = await load_gacha_data () ?? {}

  for (const a of new_gacha_elements)
  {
    const res = /\/watch_tmp\/(\w+)/.exec (a.href)
    if (res != null && res[1] != null)
    {
      const key = res[1]
      storage[key] ??= {html: a.outerHTML}
    }
  }
  await save_gacha_data (storage)
}

window.addEventListener ('DOMContentLoaded', async () => {
  insert_gacha_data ()

  // ガチャを検知する
  const ul = (await waitForElement (`ul.d_flex.flex-wrap_wrap.justify_center.gap_16px:not([class*="hold_gacha"])`))[0]
  console.log ('ul', ul)
  const observer = new MutationObserver ((mutations, observer) => {
    console.log ('ガチャを検知')
    // observer.disconnect ()
    insert_gacha_data ()
    // observer.observe (ul, {childList: true, subtree: true})
  })
  observer.observe (ul, {childList: true, subtree: true})
})
