#!/bin/bash

clear
echo "========================================"
echo "🔥 Tenkobot Firebase自動デプロイ"
echo "========================================"
echo ""
echo "このスクリプトは以下を自動的に実行します："
echo "  ✅ Firestoreルールのデプロイ"
echo "  ✅ Firestoreインデックスのデプロイ"
echo ""
echo "⚠️ 注意："
echo "  初回実行時のみ、ブラウザでGoogleログインが必要です"
echo ""
read -p "実行してもよろしいですか？ (y/N): " confirm

if [[ $confirm != [yY] && $confirm != [yY][eE][sS] ]]; then
    echo "キャンセルしました"
    exit 0
fi

echo ""
echo "========================================"
echo "ステップ1: Firebaseにログイン"
echo "========================================"
echo ""
echo "ブラウザが開きます..."
echo "Googleアカウントでログインしてください"
echo ""

firebase login

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ ログインに失敗しました"
    echo ""
    echo "💡 もし既にログイン済みの場合は、以下を実行してください："
    echo ""
    echo "   firebase deploy --only firestore:rules,firestore:indexes"
    echo ""
    exit 1
fi

echo ""
echo "✅ ログイン成功！"
echo ""
echo "========================================"
echo "ステップ2: Firestoreルールとインデックスをデプロイ"
echo "========================================"
echo ""

firebase deploy --only firestore:rules,firestore:indexes

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ デプロイに失敗しました"
    exit 1
fi

echo ""
echo "========================================"
echo "✅ デプロイ完了！"
echo "========================================"
echo ""
echo "📋 次に行うこと："
echo ""
echo "  1. https://tenkobot.vercel.app を開く"
echo "  2. Cmd+Shift+R でハードリフレッシュ"
echo "  3. 以下を確認："
echo "     ✅ ダッシュボードが表示される"
echo "     ✅ スタッフ登録ができる"
echo "     ✅ 作業マニュアル登録ができる"
echo ""
echo "❌ まだエラーが出る場合："
echo "  ブラウザのコンソール (F12) でエラーメッセージを確認してください"
echo ""
echo "========================================"
