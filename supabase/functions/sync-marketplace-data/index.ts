// supabase/functions/sync-marketplace-data/index.ts

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

console.log("Edge Function loaded!");

// 1. Gerçek Hepsiburada API'sinden geliyormuş gibi sahte bir veri oluşturuyoruz.
const mockHepsiburadaResponse = {
  orders: [
    {
      orderId: "mock-order-12345",
      status: "Kargoya Verildi",
      orderDate: new Date().toISOString(),
      customer: {
        customerId: "mock-customer-9876",
        fullName: "Ali Veli",
        email: "ali.veli@example.com",
      },
      products: [
        { name: "Akıllı Saat", quantity: 1, price: 1500 },
        { name: "Kulaklık", quantity: 1, price: 600 },
      ],
    },
    // Buraya daha fazla sahte sipariş ekleyebilirsin
  ],
};

Deno.serve(async (req) => {
  try {
    console.log("sync-marketplace-data function invoked!");

    // 2. Fonksiyonun içinden kendi Supabase veritabanımıza bağlanıyoruz.
    // Bu client, tarayıcıdaki gibi değil, daha yetkili bir client'tır.
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "" // SERVICE_ROLE_KEY daha fazla yetkiye sahiptir.
    );

    // 3. Sahte verinin içindeki her bir sipariş için işlem yapıyoruz.
    // Gerçek API geldiğinde, bu döngü aynı kalacak.
    for (const order of mockHepsiburadaResponse.orders) {
      // 4. Müşteri daha önce var mı diye kontrol et, yoksa yeni oluştur.
      const { data: customerData, error: customerError } = await supabaseClient
        .from("customers")
        .upsert(
          {
            marketplace_id: 2, // Hepsiburada'nın ID'sinin 2 olduğunu varsayalım
            platform_customer_id: order.customer.customerId,
            full_name: order.customer.fullName,
            email: order.customer.email,
          },
          { onConflict: "marketplace_id, platform_customer_id" }
        )
        .select()
        .single();

      if (customerError) throw customerError;

      // 5. Siparişi, ilgili müşteriye bağlayarak ekle.
      const { error: orderError } = await supabaseClient.from("orders").upsert(
        {
          platform_order_id: order.orderId,
          customer_id: customerData.id,
          marketplace_id: 2,
          status: order.status,
          order_date: order.orderDate,
          order_details: { products: order.products },
        },
        { onConflict: "platform_order_id" }
      ); // Aynı siparişi tekrar eklemeyi engelle

      if (orderError) throw orderError;

      console.log(
        `Order ${order.orderId} processed successfully for customer ${customerData.full_name}`
      );
    }

    return new Response(
      JSON.stringify({ message: "Mock data synchronization successful!" }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
