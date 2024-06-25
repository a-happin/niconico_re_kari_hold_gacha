const STORAGE_KEY = 're_kari_gacha'

/** @type {(selectors: string) => Promise<Element[]>} */
const waitForElement = (selectors) => new Promise ((resolve, reject) => {
  {
    const res = [... document.querySelectorAll (selectors)]
    if (res.length > 0)
    {
      return resolve (res)
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
      resolve (res)
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

  // arrayBuffer -> binary_string
  // const binary_string = String.fromCharCode (... new Uint8Array (arrayBuffer))
  // ↑だとダメでした #1
  const binary_string = [... new Uint8Array (arrayBuffer)].map ((c) => String.fromCharCode (c)).join ('')

  // binary_string -> base64
  return btoa (binary_string)
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
      div.style = 'margin: 16px;'
      div.append (createElement ('p', (p) => {}))
      div.append (createElement ('button', (button) => {
        button.append ('ガチャデータを消去する')
        button.style = `cursor: pointer; border-width: 1px; border-radius: 4px; padding: 4px;`
        button.onclick = () => {
          localStorage.removeItem (STORAGE_KEY)
          document.querySelector ('ul[class*="hold_gacha"]')?.remove ()
        }
      }))
    }))

    if (div == null)
    {
      console.error (`ガチャ保持: DOMの変更に失敗しました`)
      return
    }
  }
  div.querySelector ('p').textContent = `保持した動画数: ${Object.keys (storage).length}`

  // 保持中の動画表示領域
  const ul = document.querySelector ('ul[class*="hold_gacha"]') ?? div.insertAdjacentElement ('afterend', createElement ('ul', (ul) => {
    ul.classList.add (... `d_flex flex-wrap_wrap justify_center gap_16px hold_gacha`.split (' '))
  }))

  if (ul == null)
  {
    console.error (`ガチャ保持: DOMの変更に失敗しました`)
    return
  }

  ul.replaceChildren (... Object.values (storage).map ((a) => createElement ('li', (li) => li.insertAdjacentHTML ('beforeend', a.html))))

  await add_new_gacha_data ()
}

const add_new_gacha_data = async () => {
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
