"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/hooks/use-auth";
import { createDocument } from "@/lib/services/document-service";
import { DocumentCategory } from "@/lib/types/firestore";
import { ArrowLeft, Upload } from "lucide-react";

export default function NewDocumentPage() {
  const { admin } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "manual" as DocumentCategory,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!admin) {
      setError("管理者情報が取得できません");
      return;
    }

    if (!formData.title || !selectedFile) {
      setError("タイトルとファイルは必須です");
      return;
    }

    setLoading(true);

    try {
      // Note: In a real implementation, you would upload the file to Cloud Storage first
      // and get the fileUrl. This is a simplified version.

      // For now, we'll create a placeholder URL
      // In production, implement proper file upload to Cloud Storage
      const fileUrl = `/uploads/${selectedFile.name}`; // Placeholder

      await createDocument({
        organizationId: admin.organizationId,
        title: formData.title,
        description: formData.description,
        fileUrl,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
        category: formData.category,
        isActive: true,
      });

      router.push("/documents");
    } catch (err: any) {
      setError(err.message || "登録に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <Button
            variant="ghost"
            onClick={() => router.push("/documents")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            戻る
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">ドキュメント新規登録</h1>
          <p className="text-gray-600 mt-1">新しいドキュメントを登録します</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="title">
                  タイトル <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="配送手順マニュアル"
                  disabled={loading}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">説明</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="このドキュメントの説明を入力してください"
                  rows={3}
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">カテゴリ</Label>
                <Select
                  id="category"
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value as DocumentCategory,
                    })
                  }
                  disabled={loading}
                >
                  <option value="manual">作業マニュアル</option>
                  <option value="policy">ポリシー</option>
                  <option value="other">その他</option>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">
                  ファイル <span className="text-red-500">*</span>
                </Label>
                <div className="flex items-center space-x-4">
                  <Input
                    id="file"
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleFileChange}
                    disabled={loading}
                    className="flex-1"
                  />
                  {selectedFile && (
                    <div className="text-sm text-gray-600">
                      {selectedFile.name} (
                      {(selectedFile.size / 1024).toFixed(1)}KB)
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  PDF、Word、テキストファイルをアップロードできます（最大10MB）
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <div className="flex items-start space-x-2">
                  <Upload className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">ファイルアップロードについて</p>
                    <p>
                      本番環境では、ファイルはGoogle Cloud Storageに保存されます。
                      この画面は開発用のプレースホルダーです。
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4 pt-4">
                <Button type="submit" disabled={loading || !selectedFile}>
                  {loading ? "登録中..." : "登録"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/documents")}
                  disabled={loading}
                >
                  キャンセル
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
