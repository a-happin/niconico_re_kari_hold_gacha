ニコニコ動画(Re:仮)用 ガチャ結果保持
==

「あっ……！今の動画再生したかったのに、間違えて更新ボタン押しちゃった～！」  
な人向け

## インストール

> [!important]
> 導入は自己責任でお願いします

1. `chrome://extensions`を開く
1. 開発者モードにする
1. [Releases](https://github.com/a-happin/niconico_re_kari_hold_gacha/releases)から`niconico_re_kari_hold_gacha.zip`をダウンロードして展開して出てきたフォルダをドラッグアンドドロップでブラウザに入れる。
1. インストールし終わったら開発者モードは解除する


## アンインストール
`ガチャデータを消去する`ボタンを押してデータを消してからアンインストールする。

アンインストール前にデータを消し忘れた場合は開発者用consoleから
```js
localStorage.removeItem ('re_kari_gacha')
```
を実行すればOK


## 中身
- ガチャ結果を取得してデータをlocalStorageに圧縮して保存してます
- ~~localStorageはそんなに容量が多くないらしいのでいっぱいになるかも？~~
- ガチャしまくると重くなる可能性**大**
- エラーが出たら諦めてください
