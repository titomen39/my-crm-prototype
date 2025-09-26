// src/app/customers/page.tsx

"use client"; // Bu satır, component'in tarayıcıda çalışacağını ve interaktif olacağını belirtir.

import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabaseClient.ts"; // Proje yapımıza uygun import yolu

export default function CustomersPage() {
  // Veritabanı tablolarımızla uyumlu TypeScript tiplerini tanımlıyoruz.
  // Bu, kod yazarken otomatik tamamlama ve hata kontrolü sağlar.
  type Marketplace = {
    id: number;
    name: string;
  };

  type Customer = {
    id: number;
    created_at: string;
    full_name: string;
    email: string;
    phone: string | null;
    source: string | null;
    marketplace_id: number;
  };

  // Component'imizin "hafızasını" oluşturan state'ler
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [marketplaces, setMarketplaces] = useState<Marketplace[]>([]);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    source: "",
    marketplace_id: "", // Dropdown'ın seçili değerini tutacak
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Bu useEffect, component ekrana ilk yüklendiğinde çalışır.
  // Hem müşterileri hem de pazar yerlerini aynı anda Supabase'den çeker.
  // useEffect'in eski halini silip bunu yapıştırın

  // Lütfen mevcut useEffect'i silip bunu yapıştırın.

  useEffect(() => {
    // 1. Sayfa ilk yüklendiğinde GEREKLİ TÜM verileri (hem müşteriler hem pazar yerleri) çekiyoruz.
    async function loadInitialData() {
      setLoading(true);
      const [customersResponse, marketplacesResponse] = await Promise.all([
        supabase
          .from("customers")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("marketplaces").select("id, name"),
      ]);

      if (customersResponse.error) {
        alert("Müşteriler çekilirken hata: " + customersResponse.error.message);
      } else {
        setCustomers(customersResponse.data);
      }

      if (marketplacesResponse.error) {
        alert(
          "Pazar yerleri çekilirken hata: ".concat(
            marketplacesResponse.error.message
          )
        );
      } else {
        setMarketplaces(marketplacesResponse.data);
      }

      setLoading(false);
    }

    // Fonksiyonu çağırarak ilk verileri yüklüyoruz.
    loadInitialData();

    // 2. Realtime aboneliğini kuruyoruz.
    const channel = supabase
      .channel("customers-realtime-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "customers",
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setCustomers((currentCustomers) => [
              payload.new as Customer,
              ...currentCustomers,
            ]);
          }
          if (payload.eventType === "UPDATE") {
            setCustomers((currentCustomers) =>
              currentCustomers.map((c) =>
                c.id === payload.new.id ? (payload.new as Customer) : c
              )
            );
          }
          if (payload.eventType === "DELETE") {
            setCustomers((currentCustomers) =>
              currentCustomers.filter((c) => c.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    // 3. Component ekrandan kaldırıldığında aboneliği sonlandırıyoruz.
    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // Bağımlılık dizisi boş olduğu için bu kod sadece bir kez çalışır.

  // Formu başlangıç durumuna sıfırlar.
  const resetForm = () => {
    setForm({
      full_name: "",
      email: "",
      phone: "",
      source: "",
      marketplace_id: "",
    });
    setEditingId(null);
  };

  // Düzenle butonuna basıldığında, ilgili müşterinin bilgileriyle formu doldurur.
  const handleEdit = (customer: Customer) => {
    setForm({
      full_name: customer.full_name,
      email: customer.email,
      phone: customer.phone || "",
      source: customer.source || "",
      marketplace_id: String(customer.marketplace_id),
    });
    setEditingId(customer.id);
  };

  // Form gönderildiğinde veriyi Supabase'e kaydeder (yeni veya güncel).
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.marketplace_id) {
      alert("Lütfen bir pazar yeri seçin!");
      return;
    }

    const dataToSend = {
      ...form,
      platform_customer_id: editingId ? undefined : `manual-${Date.now()}`,
    };

    if (editingId) {
      // Güncelleme işlemi
      const { data, error } = await supabase
        .from("customers")
        .update(dataToSend)
        .eq("id", editingId)
        .select()
        .single();
      if (error) {
        alert(error.message);
      } else {
        setCustomers(customers.map((c) => (c.id === editingId ? data : c)));
      }
    } else {
      // Ekleme işlemi
      const { data, error } = await supabase
        .from("customers")
        .insert(dataToSend)
        .select()
        .single();
      if (error) {
        alert(error.message);
      } else {
        setCustomers([data, ...customers]);
      }
    }
    resetForm();
  };

  // İlgili müşteriyi Supabase'den ve ekrandan siler.
  const handleDelete = async (id: number) => {
    if (!confirm("Bu müşteriyi silmek istediğinizden emin misiniz?")) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) {
      alert(error.message);
    } else {
      setCustomers(customers.filter((c) => c.id !== id));
    }
  };

  // Component'in ekranda görünecek olan HTML (JSX) kısmı
  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto text-white">
      <h1 className="text-3xl font-bold mb-6 text-center text-blue-400">
        📋 Müşteri Yönetimi
      </h1>

      <form
        onSubmit={handleSubmit}
        className="mb-8 bg-gray-800 shadow-md rounded-lg p-6 space-y-4 border border-gray-700"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Ad Soyad"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            className="bg-gray-700 border border-gray-600 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="bg-gray-700 border border-gray-600 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <input
            type="text"
            placeholder="Telefon"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="bg-gray-700 border border-gray-600 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={form.marketplace_id}
            onChange={(e) =>
              setForm({ ...form, marketplace_id: e.target.value })
            }
            className="bg-gray-700 border border-gray-600 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="" disabled>
              -- Pazar Yeri Seçin --
            </option>
            {marketplaces.map((mp) => (
              <option key={mp.id} value={mp.id}>
                {mp.name}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Kaynak Detayı (Sipariş No, vb.)"
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
            className="bg-gray-700 border border-gray-600 rounded px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded font-semibold transition-colors"
          >
            {editingId ? "✅ Güncelle" : "➕ Ekle"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-500 hover:bg-gray-600 text-white px-5 py-2 rounded font-semibold transition-colors"
            >
              ❌ İptal
            </button>
          )}
        </div>
      </form>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse rounded-lg overflow-hidden shadow-md">
          <thead className="bg-gray-900 text-white">
            <tr>
              <th className="p-3 text-left">Ad Soyad</th>
              <th className="p-3 text-left">Email</th>
              <th className="p-3 text-left">Telefon</th>
              <th className="p-3 text-left">Pazar Yeri</th>
              <th className="p-3 text-left">Kaynak Detayı</th>
              <th className="p-3 text-center">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="text-center p-4 bg-gray-700">
                  Yükleniyor...
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center p-4 bg-gray-700">
                  Henüz müşteri eklenmedi.
                </td>
              </tr>
            ) : (
              customers.map((customer) => (
                <tr
                  key={customer.id}
                  className="bg-gray-800 hover:bg-gray-700 transition-colors"
                >
                  <td className="p-3">{customer.full_name}</td>
                  <td className="p-3">{customer.email}</td>
                  <td className="p-3">{customer.phone}</td>
                  <td className="p-3">
                    {marketplaces.find(
                      (mp) => mp.id === customer.marketplace_id
                    )?.name || "Bilinmiyor"}
                  </td>
                  <td className="p-3">{customer.source}</td>
                  <td className="p-3 flex gap-2 justify-center">
                    <button
                      onClick={() => handleEdit(customer)}
                      className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-3 py-1 rounded transition-colors"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(customer.id)}
                      className="bg-red-600 hover:bg-red-700 text-white font-semibold px-3 py-1 rounded transition-colors"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
