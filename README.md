# Tenkobot - LINE連携タイムカード & 連続エスカレーション勤怠システム

LINEで出勤確認（タイムカード）を行い、未達/未反応ならSMSや架電で段階的にエスカレーションし、管理者が状況を可視化できるWebアプリです。

## 技術スタック

- **フロントエンド**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **バックエンド**: Firebase (Auth, Firestore, Cloud Functions)
- **デプロイ**: Vercel (Web), Firebase (Functions)
- **連携**: LINE Messaging API, SMS/架電（Twilio等、差し替え可能）

## 主要機能

### 1. 出勤確認（タイムカード）
- シフトの出勤開始時刻にLINEで自動通知
- LINEリッチメニューから「出勤する」ボタンで確認
- 出勤/退勤の記録と月次集計

### 2. 連続エスカレーション（3段階）
- **段階1**: LINE未達時 → SMS/架電で本人に通知
- **段階2**: 未反応時 → 指定従業員にエスカレーション
- **段階3**: さらに未反応 → 次担当者にエスカレーション
- 各段階の待機時間・通知手段・対象を柔軟に設定可能

### 3. 管理ダッシュボード
- 本日のシフト状況を一覧表示
- 出勤確認済/未確認/エスカレーション中の可視化
- 直近の通知ログ表示
- 手動介入（再送・停止）機能

### 4. スタッフ・シフト管理
- スタッフ情報のCRUD（LINE連携、電話番号管理）
- シフトの作成・編集・自動生成（ローテーション）
- 作業内容マスタの管理

### 5. サブスクリプション対応
- トライアル（14日間無料、スタッフ5名まで）
- ベーシック（¥9,800/月、スタッフ20名まで）
- プレミアム（¥29,800/月、スタッフ100名まで）
- プロバイダInterface実装により、Stripe等と簡単に連携可能

## セットアップ

### 前提条件

- Node.js 18以上
- Firebase プロジェクト
- LINE公式アカウント（LINE Messaging API）
- Vercel アカウント（デプロイ用）

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd tenkobot
```

### 2. 依存関係のインストール

```bash
# Web アプリ
npm install

# Cloud Functions
cd functions
npm install
cd ..
```

### 3. Firebase プロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/) でプロジェクトを作成
2. Firebase CLIをインストール
   ```bash
   npm install -g firebase-tools
   ```
3. Firebaseにログイン
   ```bash
   firebase login
   ```
4. プロジェクトを初期化
   ```bash
   firebase init
   ```
   - Firestore, Functions, Hostingを選択
   - 既存のプロジェクトを選択

### 4. Firebase設定

#### 4-1. Firebase Admin SDKの秘密鍵を取得

1. Firebase Console → プロジェクト設定 → サービスアカウント
2. 「新しい秘密鍵の生成」をクリック
3. ダウンロードしたJSONファイルから以下を取得:
   - `project_id`
   - `client_email`
   - `private_key`

#### 4-2. Web アプリの設定

1. Firebase Console → プロジェクト設定 → 全般
2. 「アプリを追加」→「ウェブ」を選択
3. Firebase SDKの設定をコピー

### 5. LINE Messaging APIの設定

1. [LINE Developers Console](https://developers.line.biz/) でプロバイダーとチャネルを作成
2. Messaging API設定から以下を取得:
   - Channel Access Token
   - Channel Secret
3. Webhook URL を設定（後述）

### 6. 環境変数の設定

`.env.example` をコピーして `.env.local` を作成し、各値を設定:

```bash
cp .env.example .env.local
```

`.env.local` を編集:

```env
# Firebase Client
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin
FIREBASE_ADMIN_PROJECT_ID=your_project_id
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk@your_project.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# LINE
LINE_CHANNEL_ACCESS_TOKEN=your_line_channel_access_token
LINE_CHANNEL_SECRET=your_line_channel_secret

# Notification Provider (stub for development)
NOTIFICATION_PROVIDER=stub

# Subscription Provider (stub for development)
SUBSCRIPTION_PROVIDER=stub
```

### 7. Firestoreのデプロイ

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### 8. Cloud Functionsのデプロイ

```bash
# Functions用の環境変数を設定
firebase functions:config:set \
  line.channel_access_token="YOUR_LINE_CHANNEL_ACCESS_TOKEN" \
  line.channel_secret="YOUR_LINE_CHANNEL_SECRET"

# デプロイ
firebase deploy --only functions
```

### 9. LINE Webhook URLの設定

Cloud Functionsのデプロイ後、以下のURLを取得:
```
https://YOUR_REGION-YOUR_PROJECT_ID.cloudfunctions.net/lineWebhook
```

LINE Developers Console → Messaging API設定 → Webhook URL に設定し、「Webhookの利用」をONにする。

### 10. ローカル開発サーバーの起動

```bash
npm run dev
```

http://localhost:3000 にアクセス

## デプロイ

### Vercel へのデプロイ

1. [Vercel](https://vercel.com) にログイン
2. プロジェクトをインポート
3. 環境変数を設定（`.env.local` の内容）
4. デプロイ

### LINE Webhook URLの更新

Vercelデプロイ後、以下のURLをLINE Developers Consoleに設定:
```
https://your-domain.vercel.app/api/line/webhook
```

## 使い方

### 1. 管理者アカウントの作成

1. `/register` にアクセス
2. 組織名、管理者名、メールアドレス、パスワードを入力
3. 登録すると14日間の無料トライアルが開始

### 2. スタッフの登録

1. ダッシュボード → スタッフ管理 → 新規登録
2. スタッフ情報を入力:
   - 氏名
   - 役割（一般/リーダー/管理補助）
   - LINE User ID（LINE公式アカウントから取得）
   - 電話番号（SMS/架電用）
   - エスカレーション受信対象フラグ

### 3. 作業マスタの作成

1. ダッシュボード → 作業マスタ → 新規登録
2. 作業内容を入力:
   - 作業名
   - 説明
   - 注意事項
   - 所要時間（目安）

### 4. エスカレーション設定の作成

1. ダッシュボード → エスカレーション設定 → 新規登録
2. 各段階（最大3段階）を設定:
   - 待機時間（分）
   - 通知手段（LINE/SMS/架電）
   - 対象（本人/指定従業員/次担当）
   - 反応時の停止条件

### 5. シフトの作成

1. ダッシュボード → シフト管理 → シフト作成
2. シフト情報を入力:
   - 日付
   - 担当者（複数選択可）
   - 出勤開始時刻
   - 退勤時刻（任意）
   - 作業内容（マスタから選択）
   - エスカレーション設定（選択）

### 6. LINE リッチメニューの設定

LINE Official Account Manager でリッチメニューを作成:

```
┌─────────────┬─────────────┐
│  出勤する    │  退勤する    │
│  (Clock In) │ (Clock Out) │
├─────────────┼─────────────┤
│  本日の作業  │  勤怠確認    │
│  (Today)    │ (Attendance)│
└─────────────┴─────────────┘
```

各ボタンにPostbackアクションを設定:

**出勤する:**
```json
{
  "type": "postback",
  "data": "{\"action\":\"clock_in\",\"staffId\":\"{{staffId}}\",\"shiftId\":\"{{shiftId}}\"}"
}
```

**退勤する:**
```json
{
  "type": "postback",
  "data": "{\"action\":\"clock_out\",\"staffId\":\"{{staffId}}\",\"shiftId\":\"{{shiftId}}\"}"
}
```

## アーキテクチャ

### データフロー

1. **出勤確認の開始**
   - Cloud Scheduler が10分毎に起動
   - `checkAndSendAttendanceNotification` Function が実行
   - 該当シフトのスタッフにLINE通知送信
   - AttendanceRecord と EscalationExecution を作成

2. **スタッフの応答**
   - スタッフがLINEリッチメニューから「出勤する」をタップ
   - LINE Webhook が `/api/line/webhook` を呼び出し
   - AttendanceRecord を更新（出勤時刻記録）
   - EscalationExecution を停止

3. **エスカレーション処理**
   - Cloud Scheduler が5分毎に起動
   - `processEscalation` Function が実行
   - 未反応のEscalationExecutionを取得
   - 設定に従って次段階の通知を送信
   - 最終段階まで到達したらFailedにマーク

### 状態遷移

```
PENDING (未送信)
  ↓ Scheduler起動
SENT (LINE送信済)
  ↓─────────┬─────────
  ↓         ↓
(応答あり) UNDELIVERED (未達)
  ↓         ↓
CONFIRMED  Stage 1 (SMS/Call)
            ↓─────────
            ↓
          Stage 2 (指定従業員)
            ↓─────────
            ↓
          Stage 3 (次担当)
            ↓─────────
            ↓
          FAILED
```

## プロバイダの拡張

### SMS/架電プロバイダの実装（Twilio例）

`lib/providers/notification-provider.ts` を拡張:

```typescript
import twilio from 'twilio';

export class TwilioNotificationProvider implements NotificationProvider {
  private client: twilio.Twilio;

  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }

  async sendSMS(to: string, message: string): Promise<SMSResult> {
    try {
      const result = await this.client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: to,
      });

      return {
        success: true,
        messageId: result.sid,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async makeCall(to: string, message: string): Promise<CallResult> {
    try {
      const result = await this.client.calls.create({
        twiml: `<Response><Say language="ja-JP">${message}</Say></Response>`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: to,
      });

      return {
        success: true,
        callId: result.sid,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
```

環境変数を更新:
```env
NOTIFICATION_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_phone_number
```

### サブスクリプションプロバイダの実装（Stripe例）

`lib/providers/subscription-provider.ts` を拡張し、Stripe APIを実装。

## トラブルシューティング

### LINE Webhookが動作しない

1. LINE Developers Console で Webhook URL が正しく設定されているか確認
2. Webhook の「検証」ボタンでテスト
3. Firebase Functions のログを確認: `firebase functions:log`

### 出勤確認が送信されない

1. Cloud Scheduler が有効か確認
2. シフトの日付・時刻が正しいか確認
3. エスカレーション設定がシフトに紐付いているか確認
4. Firebase Functions のログを確認

### エスカレーションが動作しない

1. EscalationExecution の `nextExecutionAt` が正しく設定されているか確認
2. エスカレーション設定の各段階が正しく設定されているか確認
3. Cloud Functions のログを確認

## ライセンス

MIT License

## サポート

質問や問題がある場合は、Issueを作成してください。
