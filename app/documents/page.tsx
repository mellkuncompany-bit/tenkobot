"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { useAuth } from "@/lib/hooks/use-auth";
import { getDocuments, deleteDocument } from "@/lib/services/document-service";
import { Document, DocumentCategory } from "@/lib/types/firestore";
import { Plus, FileText, Download, Trash2, Eye } from "lucide-react";

export default function DocumentsPage() {
  const { admin } = useAuth();
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<DocumentCategory | "all">("all");

  useEffect(() => {
    if (!admin) return;

    const fetchDocuments = async () => {
      try {
        const data = await getDocuments(admin.organizationId);
        setDocuments(data);
      } catch (error) {
        console.error("Error fetching documents:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDocuments();
  }, [admin]);

  const handleDelete = async (documentId: string) => {
    if (!confirm("このドキュメントを削除してもよろしいですか？")) return;

    try {
      await deleteDocument(documentId);
      setDocuments(documents.filter((d) => d.id !== documentId));
    } catch (error) {
      console.error("Error deleting document:", error);
      alert("削除に失敗しました");
    }
  };

  const getCategoryLabel = (category: DocumentCategory) => {
    switch (category) {
      case "manual":
        return "作業マニュアル";
      case "policy":
        return "ポリシー";
      case "other":
        return "その他";
      default:
        return category;
    }
  };

  const getCategoryBadge = (category: DocumentCategory) => {
    switch (category) {
      case "manual":
        return <Badge variant="info">{getCategoryLabel(category)}</Badge>;
      case "policy":
        return <Badge variant="warning">{getCategoryLabel(category)}</Badge>;
      case "other":
        return <Badge variant="outline">{getCategoryLabel(category)}</Badge>;
      default:
        return <Badge>{category}</Badge>;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const filteredDocuments = categoryFilter === "all"
    ? documents
    : documents.filter((d) => d.category === categoryFilter);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">読み込み中...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">作業マニュアル</h1>
            <p className="text-gray-600 mt-1">作業マニュアルとドキュメントを管理します</p>
          </div>
          <Button onClick={() => router.push("/documents/new")}>
            <Plus className="h-4 w-4 mr-2" />
            ドキュメントを追加
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>ドキュメント一覧 ({filteredDocuments.length}件)</CardTitle>
              <Select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as any)}
              >
                <option value="all">すべてのカテゴリ</option>
                <option value="manual">作業マニュアル</option>
                <option value="policy">ポリシー</option>
                <option value="other">その他</option>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {filteredDocuments.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">
                  {categoryFilter === "all"
                    ? "ドキュメントがありません"
                    : `${getCategoryLabel(categoryFilter as DocumentCategory)}のドキュメントがありません`}
                </p>
                <Button onClick={() => router.push("/documents/new")}>
                  <Plus className="h-4 w-4 mr-2" />
                  最初のドキュメントを登録
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>タイトル</TableHead>
                    <TableHead>カテゴリ</TableHead>
                    <TableHead>ファイル名</TableHead>
                    <TableHead>サイズ</TableHead>
                    <TableHead>登録日</TableHead>
                    <TableHead className="text-right">操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.id} className="cursor-pointer hover:bg-gray-50" onClick={() => router.push(`/documents/${doc.id}`)}>
                      <TableCell className="font-medium">
                        <div>
                          <div className="text-blue-600 hover:underline">{doc.title}</div>
                          {doc.description && (
                            <div className="text-xs text-gray-500 mt-1">
                              {doc.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getCategoryBadge(doc.category)}</TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {doc.fileName}
                      </TableCell>
                      <TableCell>{formatFileSize(doc.fileSize)}</TableCell>
                      <TableCell>
                        {doc.createdAt?.toDate().toLocaleDateString("ja-JP")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(doc.fileUrl, "_blank");
                            }}
                            className="px-4"
                          >
                            {doc.category === "manual" && "作業マニュアルを確認する"}
                            {doc.category === "policy" && "ポリシーを確認する"}
                            {doc.category === "other" && "ファイルを確認する"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const link = document.createElement("a");
                              link.href = doc.fileUrl;
                              link.download = doc.fileName;
                              link.click();
                            }}
                            title="ダウンロード"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(doc.id)}
                            title="削除"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Instructions Card */}
        <Card>
          <CardHeader>
            <CardTitle>使い方</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-gray-600">
            <p>• PDFファイルをアップロードして作業マニュアルを管理できます</p>
            <p>• カテゴリを分けることで、ドキュメントを整理できます</p>
            <p>• プレビューボタンで内容を確認できます</p>
            <p>• ダウンロードボタンでファイルを保存できます</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
