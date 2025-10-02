/**
 * Service para manejar operaciones de gastos (expenses)
 * Proporciona una capa de abstracción sobre las APIs de expenses
 */

export interface Expense {
  id: string;
  workOrderId: number;
  expenseType: 'PARTS' | 'LABOR' | 'TRANSPORT' | 'TOOLS' | 'MATERIALS' | 'OTHER';
  description: string;
  amount: number;
  vendor: string;
  invoiceNumber?: string;
  receiptUrl?: string;
  expenseDate: Date;
  recordedBy: string;
  createdAt: Date;
  updatedAt: Date;
  workOrder: {
    id: number;
    title: string;
    vehicle: {
      licensePlate: string;
      brand: string;
      model: string;
    };
  };
}

export interface CreateExpenseData {
  workOrderId: number;
  expenseType: 'PARTS' | 'LABOR' | 'TRANSPORT' | 'TOOLS' | 'MATERIALS' | 'OTHER';
  description: string;
  amount: number;
  vendor: string;
  invoiceNumber?: string;
  receiptUrl?: string;
  expenseDate?: Date;
}

export interface UpdateExpenseData {
  expenseType?: 'PARTS' | 'LABOR' | 'TRANSPORT' | 'TOOLS' | 'MATERIALS' | 'OTHER';
  description?: string;
  amount?: number;
  vendor?: string;
  invoiceNumber?: string;
  receiptUrl?: string;
  expenseDate?: Date;
}

export interface ExpenseFilters {
  workOrderId?: number;
  vehicleId?: number;
  expenseType?: string;
  vendor?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}

export interface ExpenseResponse {
  expenses: Expense[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

class ExpensesService {
  private baseUrl = '/api/expenses';

  /**
   * Obtiene lista de gastos con filtros opcionales
   */
  async getExpenses(filters: ExpenseFilters = {}): Promise<ExpenseResponse> {
    const params = new URLSearchParams();

    // Agregar filtros a los parámetros
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (value instanceof Date) {
          params.append(key, value.toISOString());
        } else {
          params.append(key, value.toString());
        }
      }
    });

    const response = await fetch(`${this.baseUrl}?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error obteniendo gastos');
    }

    const data = await response.json();

    // Convertir fechas de string a Date objects
    data.expenses = data.expenses.map((expense: { expenseDate: string; createdAt: string; updatedAt: string; [key: string]: unknown }) => ({
      ...expense,
      expenseDate: new Date(expense.expenseDate),
      createdAt: new Date(expense.createdAt),
      updatedAt: new Date(expense.updatedAt),
    }));

    return data;
  }

  /**
   * Obtiene un gasto específico por ID
   */
  async getExpense(id: string): Promise<Expense> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error obteniendo gasto');
    }

    const expense = await response.json();

    // Convertir fechas
    return {
      ...expense,
      expenseDate: new Date(expense.expenseDate),
      createdAt: new Date(expense.createdAt),
      updatedAt: new Date(expense.updatedAt),
    };
  }

  /**
   * Crea un nuevo gasto
   */
  async createExpense(data: CreateExpenseData): Promise<Expense> {
    const payload = {
      ...data,
      expenseDate: data.expenseDate?.toISOString(),
    };

    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error creando gasto');
    }

    const expense = await response.json();

    return {
      ...expense,
      expenseDate: new Date(expense.expenseDate),
      createdAt: new Date(expense.createdAt),
      updatedAt: new Date(expense.updatedAt),
    };
  }

  /**
   * Actualiza un gasto existente
   */
  async updateExpense(id: string, data: UpdateExpenseData): Promise<Expense> {
    const payload = {
      ...data,
      expenseDate: data.expenseDate?.toISOString(),
    };

    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error actualizando gasto');
    }

    const expense = await response.json();

    return {
      ...expense,
      expenseDate: new Date(expense.expenseDate),
      createdAt: new Date(expense.createdAt),
      updatedAt: new Date(expense.updatedAt),
    };
  }

  /**
   * Elimina un gasto
   */
  async deleteExpense(id: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Error eliminando gasto');
    }
  }

  /**
   * Obtiene gastos por vehículo específico
   */
  async getExpensesByVehicle(vehicleId: number, limit = 50): Promise<Expense[]> {
    const result = await this.getExpenses({ vehicleId, limit });
    return result.expenses;
  }

  /**
   * Obtiene gastos por orden de trabajo específica
   */
  async getExpensesByWorkOrder(workOrderId: number): Promise<Expense[]> {
    const result = await this.getExpenses({ workOrderId });
    return result.expenses;
  }

  /**
   * Calcula total de gastos por filtros
   */
  async getTotalExpenses(filters: ExpenseFilters = {}): Promise<number> {
    const result = await this.getExpenses(filters);
    return result.expenses.reduce((total, expense) => total + expense.amount, 0);
  }

  /**
   * Obtiene gastos recientes (últimos 30 días)
   */
  async getRecentExpenses(limit = 20): Promise<Expense[]> {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - 30);

    const result = await this.getExpenses({ dateFrom, limit });
    return result.expenses;
  }

  /**
   * Busca gastos por vendor
   */
  async searchByVendor(vendor: string, limit = 50): Promise<Expense[]> {
    const result = await this.getExpenses({ vendor, limit });
    return result.expenses;
  }
}

// Singleton instance
export const expensesService = new ExpensesService();
export default expensesService;