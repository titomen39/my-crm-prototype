// 1. Az önce yüklediğimiz kütüphaneden 'createClient' fonksiyonunu çağırıyoruz.
// Artık hata vermeyecek çünkü kütüphaneyi kurduk.
import { createClient } from "@supabase/supabase-js";

// 2. Projemizin Supabase URL ve Anon Key bilgilerini alacağız.
// Bu bilgileri bir sonraki adımda .env.local dosyasına ekleyeceğiz.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 3. createClient fonksiyonunu bu bilgilerle çalıştırarak bağlantı nesnesini oluşturuyoruz.
// ve 'export' ile projenin başka yerlerinde kullanılabilir hale getiriyoruz.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
