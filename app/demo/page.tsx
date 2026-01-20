"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Users, Calendar, Clock, DollarSign, FileText, Truck, Bell, BookOpen, LayoutDashboard } from "lucide-react";

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Tenkobot 新機能デモ</h1>
          <p className="text-lg text-gray-600">実装された新機能の概要（認証なしプレビュー）</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* スタッフ・作業管理 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Users className="h-8 w-8 text-blue-600" />
                <CardTitle>スタッフ・作業管理</CardTitle>
              </div>
              <CardDescription>統合されたスタッフと作業テンプレートの管理</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>✓ 役割管理（ドライバー/管理者/経営者）</li>
                <li>✓ 免許有効期限の追跡</li>
                <li>✓ 給料計算設定（時給/日給/月給）</li>
                <li>✓ 繰り返しスケジュール設定</li>
                <li>✓ 担当作業の割り当て</li>
                <li>✓ 作業の単価設定（請求書用）</li>
              </ul>
            </CardContent>
          </Card>

          {/* 勤怠管理拡張 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Clock className="h-8 w-8 text-green-600" />
                <CardTitle>勤怠管理拡張</CardTitle>
              </div>
              <CardDescription>詳細な勤怠記録と時間管理</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>✓ 実働時間の自動計算</li>
                <li>✓ 休憩時間・残業時間の記録</li>
                <li>✓ 月次出勤簿の生成</li>
                <li>✓ 作業別集計レポート</li>
                <li>✓ CSV/PDF一括出力</li>
                <li>✓ 役割別アクセス制御</li>
              </ul>
            </CardContent>
          </Card>

          {/* 給料明細 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <DollarSign className="h-8 w-8 text-yellow-600" />
                <CardTitle>給料明細</CardTitle>
              </div>
              <CardDescription>自動給料計算とPDF生成</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>✓ 月次給料の自動計算</li>
                <li>✓ 時給/日給/月給対応</li>
                <li>✓ 残業代の自動算出</li>
                <li>✓ 手当・控除の管理</li>
                <li>✓ PDF明細書の生成</li>
                <li>✓ 手動調整機能</li>
              </ul>
            </CardContent>
          </Card>

          {/* 請求書管理 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <FileText className="h-8 w-8 text-purple-600" />
                <CardTitle>請求書管理</CardTitle>
              </div>
              <CardDescription>作業実績から自動請求書生成</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>✓ 月次請求書の自動生成</li>
                <li>✓ 作業回数×単価の計算</li>
                <li>✓ 税込/税抜の管理</li>
                <li>✓ PDF請求書の出力</li>
                <li>✓ 支払い状況の追跡</li>
                <li>✓ 請求書番号の自動採番</li>
              </ul>
            </CardContent>
          </Card>

          {/* 車両・燃料管理 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Truck className="h-8 w-8 text-red-600" />
                <CardTitle>車両・燃料管理</CardTitle>
              </div>
              <CardDescription>車両管理とガソリンレシートOCR</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>✓ 車両情報の登録・管理</li>
                <li>✓ 車検期限の追跡</li>
                <li>✓ ガソリンレシートのOCR読取</li>
                <li>✓ 給油記録の自動保存</li>
                <li>✓ 燃費レポートの生成</li>
                <li>✓ 月次燃料費の集計</li>
              </ul>
            </CardContent>
          </Card>

          {/* リマインダー */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <Bell className="h-8 w-8 text-orange-600" />
                <CardTitle>リマインダー</CardTitle>
              </div>
              <CardDescription>期限管理と自動通知</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>✓ 免許有効期限の通知（1ヶ月前）</li>
                <li>✓ 車検期限の通知（1ヶ月前）</li>
                <li>✓ 毎日自動チェック（午前9時）</li>
                <li>✓ 期限切れの警告表示</li>
                <li>✓ 管理者・経営者への通知</li>
                <li>✓ LINE通知との連携</li>
              </ul>
            </CardContent>
          </Card>

          {/* 作業マニュアル */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <BookOpen className="h-8 w-8 text-indigo-600" />
                <CardTitle>作業マニュアル</CardTitle>
              </div>
              <CardDescription>PDF文書の管理と共有</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>✓ PDF文書のアップロード</li>
                <li>✓ カテゴリ別整理</li>
                <li>✓ プレビュー機能</li>
                <li>✓ ダウンロード機能</li>
                <li>✓ スタッフ向け共有</li>
                <li>✓ 文書の検索・絞り込み</li>
              </ul>
            </CardContent>
          </Card>

          {/* ダッシュボード改善 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <LayoutDashboard className="h-8 w-8 text-teal-600" />
                <CardTitle>ダッシュボード改善</CardTitle>
              </div>
              <CardDescription>情報の可視化と通知機能</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>✓ 本日のシフト一覧表示</li>
                <li>✓ 出勤状況のリアルタイム表示</li>
                <li>✓ エスカレーション設定の視認性向上</li>
                <li>✓ お知らせウィジェット</li>
                <li>✓ リマインダーアラート</li>
                <li>✓ 3カラムレイアウト</li>
              </ul>
            </CardContent>
          </Card>

          {/* LINE連携拡張 */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <svg className="h-8 w-8 text-green-500" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.771.039 1.078l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"></path>
                </svg>
                <CardTitle>LINE連携拡張</CardTitle>
              </div>
              <CardDescription>自然言語処理とOCR機能</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>✓ ガソリンレシートの画像認識</li>
                <li>✓ 金額・リットル・日付の自動抽出</li>
                <li>✓ シフト変更の自然文解析</li>
                <li>✓ 「5月10日から15日まで休み」対応</li>
                <li>✓ 確認メッセージの送信</li>
                <li>✓ 車両選択リッチメニュー</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* 技術的な実装詳細 */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>実装された技術詳細</CardTitle>
            <CardDescription>バックエンドとインフラストラクチャ</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">新規Firestoreコレクション</h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• vehicles（車両管理）</li>
                  <li>• fuelReceipts（ガソリンレシート）</li>
                  <li>• payrollRecords（給料明細）</li>
                  <li>• invoices（請求書）</li>
                  <li>• documents（作業マニュアル）</li>
                  <li>• announcements（お知らせ）</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">新規サービス層</h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• vehicle-service.ts</li>
                  <li>• fuel-receipt-service.ts</li>
                  <li>• payroll-service.ts</li>
                  <li>• invoice-service.ts</li>
                  <li>• document-service.ts</li>
                  <li>• announcement-service.ts</li>
                  <li>• ocr-service.ts</li>
                  <li>• shift-parser-service.ts</li>
                  <li>• pdf-service.ts</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Cloud Functions</h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• dailyLicenseCheck（毎日9時）</li>
                  <li>• dailyVehicleInspectionCheck（毎日9時）</li>
                  <li>• monthlyPayrollGeneration（毎月1日）</li>
                  <li>• checkOvertimeWork（Firestore trigger）</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">セキュリティとアクセス制御</h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li>• 役割ベースアクセス制御（RBAC）</li>
                  <li>• Firestore Security Rules更新</li>
                  <li>• ドライバー：自分の記録のみ閲覧</li>
                  <li>• 管理者：全記録の閲覧・編集</li>
                  <li>• 経営者：全権限</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 注意事項 */}
        <Card className="mt-8 border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800">⚠️ 現在の状態</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-yellow-700">
            <p>このデモページは認証なしで新機能の概要を確認するためのものです。</p>
            <p className="mt-2">現在、Firebase APIキーの設定に問題があるため、ログインができません。以下を確認してください：</p>
            <ul className="mt-2 space-y-1 ml-4">
              <li>1. Firebase Consoleでプロジェクト「tenkobot-818dc」が有効か確認</li>
              <li>2. APIキー「AIzaSyDGpflQ2itTItdvko7_A34mHD2UNYf1nmk」が有効か確認</li>
              <li>3. APIキーの制限設定で「localhost」が許可されているか確認</li>
              <li>4. 必要に応じて新しいAPIキーを生成して.env.localを更新</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
