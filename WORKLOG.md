# WORKLOG — kinoko-blade（菌血闘技 / KINOKO BLADE）

gitに残らない行為だけを書く（ファイルの変更は git log にある）。
書式: `- YYYY-MM-DD 何を / 相手・宛先 / 結果 → 次のアクション`

## 決めたこと

- **2026-08-15 public にする。** 理由は「人に見せるから」（CEO発言）。
  既定は private だが、依存ゼロの単体HTMLなので **GitHub Pages でURLを渡すだけで遊べる**のが
  見せる手段として一番速い。ZIPを送る・手元で開かせる、は却下（相手の手間が増える）。
- **2026-08-15 置き場所は `~/dev/kinoko-blade`。** 最初 `~/kinoko-blade`（ホーム直下）に作ったが、
  早見表に載る置き場は `~/dev/` `~/Desktop/` `~/FNT-Apps/` の3つと決めてあるので移動した。
  ホーム直下は表から漏れて次回迷う。
- **2026-08-15 `balance-sim.js` を `tools/` に移した。** README が `node tools/balance-sim.js` と
  書いているのにファイルはルートにあり、**READMEの通りに打つと動かない**状態だった。
  READMEを直すのではなくファイルを動かした（READMEの構成が意図した形なので）。
- **2026-08-15 バランス数値の二重管理は残したまま公開。** `index.html` の `SPECIES` と
  `tools/balance-sim.js` の配列が同じ値を手動同期している。片方だけ直すとシムが嘘をつく。
  `balance.json` への一元化は README の TODO にあるとおり次の一手（今回はやらない）。

## ログ

- 2026-08-15 Downloads の `files 2` から3ファイルを回収 / — / `~/dev/kinoko-blade` へ移動（コピーではなく移動。Downloads側は削除済み） → 完了
- 2026-08-15 秘密チェック（sk- / API_KEY / SECRET / TOKEN / password / メール / 電話番号）/ — / 検出ゼロ。public化して問題なし → 完了
- 2026-08-15 `node tools/balance-sim.js` を実走 / — / 動作OK。平均勝率 44.8%〜53.5%（README記載は 45.3%〜55.0%。シムは乱数なので試行ごとにこの程度は振れる。表は書いた時点の実測として残す） → 完了
- 2026-08-15 GitHub に public で作成 + Pages 公開 / — / 下記「公開URL」参照 → 人に見せる

## 公開URL

- リポジトリ: https://github.com/hokutomiyazaki-arch/kinoko-blade
- 遊ぶ: https://hokutomiyazaki-arch.github.io/kinoko-blade/

## 待ち・未完了

- なし
