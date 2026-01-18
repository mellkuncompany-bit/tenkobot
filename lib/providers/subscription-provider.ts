/**
 * Subscription Provider Interface
 * Payment providers can be swapped (Stub -> Stripe -> other providers)
 */

export interface Customer {
  id: string;
  email: string;
}

export interface Subscription {
  id: string;
  customerId: string;
  plan: string;
  status: "active" | "canceled" | "past_due";
  currentPeriodEnd: Date;
}

export interface SubscriptionProvider {
  /**
   * Create a new customer
   */
  createCustomer(email: string, organizationId: string): Promise<Customer>;

  /**
   * Create a new subscription
   */
  createSubscription(customerId: string, plan: string): Promise<Subscription>;

  /**
   * Cancel a subscription
   */
  cancelSubscription(subscriptionId: string): Promise<void>;

  /**
   * Update subscription plan
   */
  updateSubscription(subscriptionId: string, newPlan: string): Promise<Subscription>;

  /**
   * Get subscription details
   */
  getSubscription(subscriptionId: string): Promise<Subscription | null>;
}

/**
 * Get subscription provider instance
 */
export function getSubscriptionProvider(): SubscriptionProvider {
  const providerType = process.env.SUBSCRIPTION_PROVIDER || "stub";

  switch (providerType) {
    case "stripe":
      // Future implementation
      throw new Error("Stripe provider not implemented yet");
    case "stub":
    default:
      return new StubSubscriptionProvider();
  }
}

/**
 * Stub Subscription Provider (for development)
 */
export class StubSubscriptionProvider implements SubscriptionProvider {
  async createCustomer(email: string, organizationId: string): Promise<Customer> {
    console.log("[STUB SUBSCRIPTION] Create customer:", { email, organizationId });
    return {
      id: `stub_customer_${Date.now()}`,
      email,
    };
  }

  async createSubscription(customerId: string, plan: string): Promise<Subscription> {
    console.log("[STUB SUBSCRIPTION] Create subscription:", { customerId, plan });
    return {
      id: `stub_subscription_${Date.now()}`,
      customerId,
      plan,
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    };
  }

  async cancelSubscription(subscriptionId: string): Promise<void> {
    console.log("[STUB SUBSCRIPTION] Cancel subscription:", subscriptionId);
  }

  async updateSubscription(subscriptionId: string, newPlan: string): Promise<Subscription> {
    console.log("[STUB SUBSCRIPTION] Update subscription:", { subscriptionId, newPlan });
    return {
      id: subscriptionId,
      customerId: "stub_customer",
      plan: newPlan,
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
  }

  async getSubscription(subscriptionId: string): Promise<Subscription | null> {
    console.log("[STUB SUBSCRIPTION] Get subscription:", subscriptionId);
    return {
      id: subscriptionId,
      customerId: "stub_customer",
      plan: "basic",
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
  }
}
