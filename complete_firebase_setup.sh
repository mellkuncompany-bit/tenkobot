#!/bin/bash

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔥 Firebase Storage 自動セットアップ"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Safariで Firebase Storage の設定ページが開いています。"
echo ""
echo "以下の3ステップを実行してください："
echo ""
echo "  1️⃣  「Get Started」または「始める」をクリック"
echo "  2️⃣  「本番環境モードで開始」→「次へ」をクリック"
echo "  3️⃣  「asia-northeast1 (Tokyo)」を選択 →「完了」をクリック"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "完了したら Enter キーを押してください..."
read

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📡 Firebase Storage のセットアップ状態を確認中..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 最大30秒間、Storage がセットアップされるのを待つ
max_attempts=6
attempt=0

while [ $attempt -lt $max_attempts ]; do
    attempt=$((attempt + 1))
    echo "🔍 確認中... ($attempt/$max_attempts)"

    # Firebase Storage へのデプロイを試行
    if firebase deploy --only storage > /tmp/firebase_deploy.log 2>&1; then
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "✅ Firebase Storage ルールのデプロイに成功しました！"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        cat /tmp/firebase_deploy.log
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "🎉 すべての作業が完了しました！"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""
        echo "📋 次の確認項目："
        echo ""
        echo "  1. https://tenkobot.vercel.app/staffs/new"
        echo "     → スタッフ登録で担当作業の自由入力ができる"
        echo ""
        echo "  2. https://tenkobot.vercel.app/documents"
        echo "     → PDFファイルをアップロードして閲覧できる"
        echo ""
        echo "  3. https://tenkobot.vercel.app/dashboard"
        echo "     → エラーなしで表示される"
        echo ""
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        exit 0
    fi

    # エラーログを確認
    if grep -q "has not been set up" /tmp/firebase_deploy.log; then
        echo "⏳ まだセットアップされていません。5秒後に再確認します..."
        sleep 5
    else
        echo ""
        echo "❌ 予期しないエラーが発生しました："
        echo ""
        cat /tmp/firebase_deploy.log
        echo ""
        exit 1
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "⚠️  タイムアウト"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Firebase Storage のセットアップが完了していないようです。"
echo ""
echo "以下を確認してください："
echo "  1. Safari で Firebase Console が開いているか"
echo "  2. 「完了」ボタンをクリックしたか"
echo "  3. セットアップ完了メッセージが表示されたか"
echo ""
echo "完了後、以下のコマンドを手動で実行してください："
echo ""
echo "  firebase deploy --only storage"
echo ""
exit 1
