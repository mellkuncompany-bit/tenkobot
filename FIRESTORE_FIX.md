# Firestoreエラー修正ガイド

## 🚀 最も簡単な修正方法（推奨）

### ステップ1: 以下のリンクを**順番に**クリックしてください

各リンクをクリックすると、Firebaseコンソールが開き、「インデックスを作成」ボタンが表示されます。
すべてのリンクで「インデックスを作成」をクリックしてください。

#### 1. shiftsコレクション（ダッシュボード用）
```
https://console.firebase.google.com/v1/r/project/tenkobot-818dc/firestore/indexes?create_composite=ClRwcm9qZWN0cy90ZW5rb2JvdC04MThkYy9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvc2hpZnRzL2luZGV4ZXMvXxABGhIKDm9yZ2FuaXphdGlvbklkEAEaCAoEZGF0ZRABGgwKCF9fbmFtZV9fEAE
```

#### 2. documentsコレクション（作業マニュアル用）
```
https://console.firebase.google.com/v1/r/project/tenkobot-818dc/firestore/indexes?create_composite=Clhwcm9qZWN0cy90ZW5rb2JvdC04MThkYy9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvZG9jdW1lbnRzL2luZGV4ZXMvXxABGhIKDm9yZ2FuaXphdGlvbklkEAEaCgoGaXNBY3RpdmUQARoNCgljcmVhdGVkQXQQAhoMCghfX25hbWVfXxAC
```

#### 3. staffsコレクション（スタッフ登録用）
```
https://console.firebase.google.com/v1/r/project/tenkobot-818dc/firestore/indexes?create_composite=ClZwcm9qZWN0cy90ZW5rb2JvdC04MThkYy9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvc3RhZmZzL2luZGV4ZXMvXxABGhIKDm9yZ2FuaXphdGlvbklkEAEaCgoGaXNBY3RpdmUQARoNCgljcmVhdGVkQXQQAhoMCghfX25hbWVfXxAC
```

### ステップ2: インデックス作成を確認

各リンクで以下の操作を行ってください：

1. **リンクをクリック** → Firebaseコンソールが開く
2. **「インデックスを作成」または「Create Index」ボタンをクリック**
3. 「作成中...」と表示されるので、**そのまま待つ**（約30秒〜2分）
4. ✅ 「有効」または「Enabled」と表示されたら完了

### ステップ3: ブラウザをリフレッシュ

すべてのインデックスが「有効」になったら：

1. https://tenkobot.vercel.app を開く
2. **Ctrl+Shift+R** (Windows) または **Cmd+Shift+R** (Mac) でハードリフレッシュ
3. ダッシュボード、作業マニュアル、スタッフ登録が正常に動作することを確認

---

## 🔧 代替方法：コマンドラインから実行

もし上記のリンクがうまく動かない場合は、以下のコマンドを実行してください：

```bash
cd /Users/AI/Desktop/tenkobot
firebase login
firebase deploy --only firestore:rules,firestore:indexes
```

### 実行手順：

1. **ターミナルを開く** (アプリケーション → ユーティリティ → ターミナル)
2. 上記の3つのコマンドを**順番に**コピー＆ペーストして実行
3. `firebase login` を実行すると**ブラウザが開く**ので、Googleアカウントでログイン
4. `firebase deploy` を実行してデプロイ完了を待つ

---

## ❓ トラブルシューティング

### Q: リンクをクリックしても何も起こらない
**A:** リンクを右クリック → 「新しいタブで開く」を試してください

### Q: 「権限がありません」と表示される
**A:** Firebaseプロジェクトのオーナー権限があるGoogleアカウントでログインしてください

### Q: インデックスが「作成中」のまま動かない
**A:** 5分ほど待ってから、ページをリフレッシュしてください

### Q: それでもエラーが出る
**A:** ブラウザのコンソール（F12キー）を開いて、エラーメッセージをコピーして教えてください

---

## ✅ 修正完了の確認

以下がすべて動作すれば成功です：

- [ ] ダッシュボードが表示される（エラーなし）
- [ ] 作業マニュアルページが表示される
- [ ] スタッフを新規登録できる
- [ ] 作業マニュアルを登録できる
- [ ] 作業を新規登録できる
