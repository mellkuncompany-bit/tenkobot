import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import {
  Invoice,
  CreateInvoice,
  InvoiceItem,
  Shift,
  WorkTemplate,
} from "@/lib/types/firestore";

export interface InvoiceFilters {
  year?: number;
  month?: number;
  status?: "draft" | "sent" | "paid";
}

/**
 * Get invoices for an organization with optional filters
 */
export async function getInvoices(
  organizationId: string,
  filters?: InvoiceFilters
): Promise<Invoice[]> {
  let q = query(
    collection(db, COLLECTIONS.INVOICES),
    where("organizationId", "==", organizationId)
  );

  if (filters?.year) {
    q = query(q, where("year", "==", filters.year));
  }

  if (filters?.month) {
    q = query(q, where("month", "==", filters.month));
  }

  if (filters?.status) {
    q = query(q, where("status", "==", filters.status));
  }

  const snapshot = await getDocs(q);
  const invoices = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Invoice[];

  // Sort by year and month descending
  return invoices.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
}

/**
 * Get a single invoice by ID
 */
export async function getInvoice(invoiceId: string): Promise<Invoice | null> {
  const docRef = doc(db, COLLECTIONS.INVOICES, invoiceId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  return {
    id: docSnap.id,
    ...docSnap.data(),
  } as Invoice;
}

/**
 * Create a new invoice
 */
export async function createInvoice(
  data: Omit<CreateInvoice, "createdAt" | "updatedAt">
): Promise<string> {
  const docRef = await addDoc(collection(db, COLLECTIONS.INVOICES), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return docRef.id;
}

/**
 * Update an invoice
 */
export async function updateInvoice(
  invoiceId: string,
  data: Partial<Omit<Invoice, "id" | "createdAt" | "updatedAt">>
): Promise<void> {
  const docRef = doc(db, COLLECTIONS.INVOICES, invoiceId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Generate invoice for a specific month based on completed shifts
 */
export async function generateInvoiceForMonth(
  organizationId: string,
  year: number,
  month: number,
  clientName: string,
  clientAddress: string
): Promise<string> {
  // Get completed shifts for the month
  const monthStr = `${year}-${String(month).padStart(2, "0")}`;
  const startDate = `${monthStr}-01`;
  const endDate = `${monthStr}-${new Date(year, month, 0).getDate()}`;

  const shiftsQuery = query(
    collection(db, COLLECTIONS.SHIFTS),
    where("organizationId", "==", organizationId),
    where("status", "==", "completed")
  );
  const shiftsSnapshot = await getDocs(shiftsQuery);
  const allShifts = shiftsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Shift[];

  // Filter shifts for the month
  const monthShifts = allShifts.filter((s) => s.date >= startDate && s.date <= endDate);

  // Get work templates
  const workTemplatesQuery = query(
    collection(db, COLLECTIONS.WORK_TEMPLATES),
    where("organizationId", "==", organizationId)
  );
  const workTemplatesSnapshot = await getDocs(workTemplatesQuery);
  const workTemplates = workTemplatesSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as WorkTemplate[];

  const workTemplateMap = new Map(workTemplates.map((wt) => [wt.id, wt]));

  // Count work by template
  const workCounts = monthShifts.reduce((acc, shift) => {
    const templateId = shift.workTemplateId;
    acc[templateId] = (acc[templateId] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Create invoice items
  const items: InvoiceItem[] = Object.entries(workCounts).map(([templateId, quantity]) => {
    const template = workTemplateMap.get(templateId);
    const workTemplateName = template?.name || "不明な作業";
    const unitPrice = template?.unitPrice || 0;
    return {
      workTemplateName,
      quantity,
      unitPrice,
      amount: quantity * unitPrice,
    };
  });

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const tax = Math.round(subtotal * 0.1); // 10% tax
  const total = subtotal + tax;

  // Generate invoice number
  const invoiceNumber = `INV-${year}${String(month).padStart(2, "0")}-${Date.now()}`;

  // Calculate due date (30 days from end of month)
  const dueDate = new Date(year, month, 30);
  const dueDateStr = dueDate.toISOString().split("T")[0];

  const invoiceData: Omit<CreateInvoice, "createdAt" | "updatedAt"> = {
    organizationId,
    invoiceNumber,
    year,
    month,
    clientName,
    clientAddress,
    items,
    subtotal,
    tax,
    total,
    status: "draft",
    dueDate: dueDateStr,
    paidDate: null,
    notes: "",
  };

  return await createInvoice(invoiceData);
}
