# 配車表ドラッグ&ドロップ機能 設計書

## 概要

作業別配車表から日程をドラッグして、スタッフ別配車表にドロップすることで、作業をスタッフに割り当てる機能。

---

## 要件

### 基本動作

1. **ドラッグ元**: 作業別配車表の日程セル（時間付き）
2. **ドロップ先**: スタッフ別配車表の対応する日付のセル
3. **ドロップ時の動作**:
   - スタッフ別配車表の「担当作業」欄に作業名が追記される
   - 作業別配車表の該当日付にスタッフ名が表示される（全日程ではなく、該当日のみ）

### 制約

1. **日付の一致**: 同じ日付のセルにのみドロップ可能
2. **繰り返しスケジュールの考慮**: WorkTemplateの`recurringSchedule.daysOfWeek`に基づいて、ドロップ可能な曜日を制限
3. **重複防止**: 同じスタッフが同じ日に同じ作業を複数割り当てられないようにする

---

## 技術スタック

### React DnD vs HTML5 Drag and Drop API

| 項目 | React DnD | HTML5 Drag and Drop |
|------|-----------|---------------------|
| **学習曲線** | やや高い | 中程度 |
| **モバイル対応** | 追加ライブラリ必要 | タッチイベントを自前実装 |
| **柔軟性** | 高い | 中程度 |
| **バンドルサイズ** | +20KB程度 | 0 |

**推奨**: HTML5 Drag and Drop API + タッチイベント対応（react-dnd-touch-backendの追加なし）

理由:
- 既存のコードベースがシンプル
- React DnDの学習コストを避ける
- モバイル対応は自前のタッチイベントハンドラで対応可能

---

## データモデル

### Shift型の拡張（すでに実装済み）

```typescript
interface Shift {
  // 既存フィールド...

  // ドラッグ&ドロップで割り当てられた場合に使用
  assignedStaffId: string | null; // ドロップされたスタッフのID
  assignedDate: string;           // YYYY-MM-DD形式
}
```

**注意**: 現在のShift型にはすでに`staffId`や関連フィールドがあるため、新規フィールドは不要かもしれません。既存の`Shift`構造を確認して、適切に使用してください。

---

## 実装手順

### Phase 1: ドラッグ可能な要素の設定

#### 1.1 作業別配車表のセルをドラッグ可能に

**ファイル**: `app/dispatch/page.tsx`（作業別配車表のセル部分）

```tsx
<td
  draggable={dayShifts.length > 0}
  onDragStart={(e) => handleDragStart(e, {
    templateId: templateId,
    date: dateKey,
    shifts: dayShifts,
    workTemplateName: templateName
  })}
  onDragEnd={handleDragEnd}
  className="..."
>
  {/* 既存のコンテンツ */}
</td>
```

#### 1.2 ドラッグデータの管理

```typescript
// State
const [dragData, setDragData] = useState<{
  templateId: string;
  date: string;
  shifts: Shift[];
  workTemplateName: string;
} | null>(null);

// Handler
const handleDragStart = (
  e: React.DragEvent,
  data: { templateId: string; date: string; shifts: Shift[]; workTemplateName: string }
) => {
  setDragData(data);
  e.dataTransfer.effectAllowed = 'move';

  // ドラッグイメージをカスタマイズ（オプション）
  const dragImage = document.createElement('div');
  dragImage.textContent = data.workTemplateName;
  dragImage.style.padding = '8px';
  dragImage.style.backgroundColor = '#3b82f6';
  dragImage.style.color = 'white';
  dragImage.style.borderRadius = '4px';
  document.body.appendChild(dragImage);
  e.dataTransfer.setDragImage(dragImage, 0, 0);
  setTimeout(() => document.body.removeChild(dragImage), 0);
};

const handleDragEnd = () => {
  setDragData(null);
};
```

---

### Phase 2: ドロップ先の設定

#### 2.1 スタッフ別配車表のセルをドロップ可能に

```tsx
<td
  onDragOver={(e) => handleDragOver(e, dateKey, staff)}
  onDrop={(e) => handleDrop(e, dateKey, staff)}
  className={`... ${
    canDrop(dateKey, staff) ? 'bg-green-50 border-green-300' : ''
  }`}
>
  {/* 既存のコンテンツ */}
</td>
```

#### 2.2 ドロップ可能かの判定

```typescript
const canDrop = (dateKey: string, staff: Staff): boolean => {
  if (!dragData) return false;

  // 1. 日付が一致するか
  if (dragData.date !== dateKey) return false;

  // 2. WorkTemplateの繰り返しスケジュールをチェック
  const template = workTemplates.find(t => t.id === dragData.templateId);
  if (!template || !template.recurringSchedule) return true; // 繰り返しなしは常にOK

  const date = new Date(dateKey);
  const dayOfWeek = date.getDay();

  if (!template.recurringSchedule.daysOfWeek.includes(dayOfWeek)) {
    return false; // この曜日は許可されていない
  }

  // 3. 重複チェック（同じスタッフが同じ日に同じ作業を持っているか）
  const existingShifts = shifts.filter(
    s => s.staffId === staff.id && s.date === dateKey && s.workTemplateId === dragData.templateId
  );
  if (existingShifts.length > 0) return false;

  return true;
};

const handleDragOver = (e: React.DragEvent, dateKey: string, staff: Staff) => {
  if (canDrop(dateKey, staff)) {
    e.preventDefault(); // ドロップを許可
    e.dataTransfer.dropEffect = 'move';
  }
};
```

#### 2.3 ドロップ時の処理

```typescript
const handleDrop = async (e: React.DragEvent, dateKey: string, staff: Staff) => {
  e.preventDefault();

  if (!dragData || !admin || !canDrop(dateKey, staff)) return;

  try {
    // 新しいShiftを作成して、スタッフに割り当て
    const template = workTemplates.find(t => t.id === dragData.templateId);
    if (!template) return;

    const newShift: Omit<Shift, 'id' | 'createdAt' | 'updatedAt'> = {
      organizationId: admin.organizationId,
      workTemplateId: dragData.templateId,
      staffId: staff.id, // ドロップされたスタッフに割り当て
      date: dateKey,
      startTime: dragData.shifts[0]?.startTime || template.reportCheckTime || '',
      endTime: dragData.shifts[0]?.endTime || '',
      vehicleId: null,
      notes: '',
      // その他の必須フィールド
    };

    // Firestoreに保存
    await createShift(newShift);

    // ローカル状態を更新
    await fetchData();

    // 成功メッセージ（オプション）
    alert(`${template.name}を${staff.name}に割り当てました`);
  } catch (error) {
    console.error('Error assigning shift:', error);
    alert('割り当てに失敗しました');
  } finally {
    setDragData(null);
  }
};
```

---

### Phase 3: ビジュアルフィードバック

#### 3.1 ドラッグ中の視覚効果

```css
/* globals.css に追加 */
.dragging {
  opacity: 0.5;
  cursor: grabbing;
}

.drop-target-valid {
  background-color: #dcfce7; /* green-100 */
  border: 2px dashed #22c55e; /* green-500 */
}

.drop-target-invalid {
  background-color: #fee2e2; /* red-100 */
  border: 2px dashed #ef4444; /* red-500 */
  cursor: not-allowed;
}
```

#### 3.2 ドラッグ中の状態管理

```typescript
const [isDragging, setIsDragging] = useState(false);

const handleDragStart = (...) => {
  setIsDragging(true);
  // 既存のコード
};

const handleDragEnd = () => {
  setIsDragging(false);
  setDragData(null);
};

// セルのクラス名に動的に適用
<td
  className={`
    ...
    ${isDragging && canDrop(dateKey, staff) ? 'drop-target-valid' : ''}
    ${isDragging && !canDrop(dateKey, staff) ? 'drop-target-invalid' : ''}
  `}
>
```

---

### Phase 4: モバイル対応（タッチイベント）

#### 4.1 タッチイベントハンドラの追加

```typescript
const [touchDragData, setTouchDragData] = useState<{
  templateId: string;
  date: string;
  shifts: Shift[];
  workTemplateName: string;
  startX: number;
  startY: number;
} | null>(null);

const handleTouchStart = (
  e: React.TouchEvent,
  data: { templateId: string; date: string; shifts: Shift[]; workTemplateName: string }
) => {
  const touch = e.touches[0];
  setTouchDragData({
    ...data,
    startX: touch.clientX,
    startY: touch.clientY
  });
};

const handleTouchMove = (e: React.TouchEvent) => {
  if (!touchDragData) return;

  const touch = e.touches[0];

  // ドラッグ中の要素の位置を更新（視覚フィードバック）
  // 実装はオプション：フローティング要素を表示
};

const handleTouchEnd = (e: React.TouchEvent) => {
  if (!touchDragData) return;

  const touch = e.changedTouches[0];
  const elementAtPoint = document.elementFromPoint(touch.clientX, touch.clientY);

  // ドロップ先のセルを特定
  const dropCell = elementAtPoint?.closest('[data-drop-cell]');
  if (dropCell) {
    const staffId = dropCell.getAttribute('data-staff-id');
    const date = dropCell.getAttribute('data-date');

    const staff = staffs.find(s => s.id === staffId);
    if (staff && date) {
      // handleDropと同じロジックを実行
      // ...
    }
  }

  setTouchDragData(null);
};
```

#### 4.2 ドロップ先セルにデータ属性を追加

```tsx
<td
  data-drop-cell
  data-staff-id={staff.id}
  data-date={dateKey}
  onTouchStart={(e) => {
    // 既存のタッチイベント（長押しメニュー）との競合を避ける
    // 必要に応じて調整
  }}
>
```

---

## UIの改善案

### 1. ドラッグハンドルの追加

作業別配車表のセルに、ドラッグ可能なことを示すアイコンを追加：

```tsx
import { GripVertical } from 'lucide-react';

<div className="flex items-center gap-1">
  {dayShifts.length > 0 && (
    <GripVertical className="h-3 w-3 text-gray-400 cursor-grab" />
  )}
  {/* 既存のコンテンツ */}
</div>
```

### 2. ツールチップの追加

ドラッグ可能なセルにホバー時のツールチップ：

```tsx
title={dayShifts.length > 0 ? "ドラッグしてスタッフに割り当て" : undefined}
```

### 3. アニメーション

ドロップ成功時のアニメーション（オプション）：

```css
@keyframes drop-success {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
    background-color: #dcfce7;
  }
  100% {
    transform: scale(1);
  }
}

.drop-success {
  animation: drop-success 0.3s ease-in-out;
}
```

---

## セキュリティとバリデーション

### 1. サーバーサイドバリデーション

クライアントサイドの検証だけでなく、Firestore Security Rulesでも以下を確認：

```javascript
// firestore.rules
match /shifts/{shiftId} {
  allow create: if
    // 認証済みユーザー
    request.auth != null &&

    // 組織IDが一致
    request.resource.data.organizationId == request.auth.token.organizationId &&

    // スタッフIDが存在する
    exists(/databases/$(database)/documents/staffs/$(request.resource.data.staffId)) &&

    // WorkTemplateIDが存在する
    exists(/databases/$(database)/documents/workTemplates/$(request.resource.data.workTemplateId));
}
```

### 2. 重複チェック

Firestore側でも重複を防ぐために、ユニーク制約を検討（Cloud Function）：

```typescript
// functions/src/index.ts
export const validateShiftCreation = functions.firestore
  .document('shifts/{shiftId}')
  .onCreate(async (snap, context) => {
    const shift = snap.data() as Shift;

    // 同じスタッフ・日付・作業の組み合わせが存在するかチェック
    const duplicates = await admin.firestore()
      .collection('shifts')
      .where('organizationId', '==', shift.organizationId)
      .where('staffId', '==', shift.staffId)
      .where('date', '==', shift.date)
      .where('workTemplateId', '==', shift.workTemplateId)
      .get();

    if (duplicates.size > 1) {
      // 重複が見つかった場合、新しいドキュメントを削除
      await snap.ref.delete();
      console.warn('Duplicate shift detected and removed:', shift);
    }
  });
```

---

## テスト計画

### 1. 単体テスト

- `canDrop`関数のテスト（各種条件分岐）
- `handleDrop`関数のテスト（モック使用）

### 2. 統合テスト

- ドラッグ開始からドロップまでの一連の流れ
- エラーハンドリング（ネットワークエラー、バリデーションエラー）

### 3. E2Eテスト

- Playwrightを使用して、実際のブラウザで操作をシミュレート
- モバイルデバイスでのタッチ操作テスト

---

## パフォーマンス最適化

### 1. debounce/throttle

ドラッグ中のイベントは頻繁に発生するため、処理を間引く：

```typescript
import { throttle } from 'lodash';

const handleDragOverThrottled = useMemo(
  () => throttle(handleDragOver, 100),
  [handleDragOver]
);
```

### 2. 仮想化

大量のスタッフや作業がある場合、react-windowなどで仮想化を検討。

---

## 将来の拡張

### 1. マルチセレクト

複数の日付を一度にドラッグして、まとめて割り当て。

### 2. ドラッグでの順序変更

スタッフ別配車表内で、作業の順序を入れ替える。

### 3. ドラッグでの作業削除

ドラッグして「ゴミ箱」エリアにドロップすると、割り当てを解除。

---

## まとめ

この設計書に基づいて実装することで、直感的で使いやすいドラッグ&ドロップ機能を実現できます。

**実装優先度**:
1. Phase 1 & 2（基本的なドラッグ&ドロップ）
2. Phase 3（視覚フィードバック）
3. Phase 4（モバイル対応）

質問や不明点があれば、実装前にご相談ください。
