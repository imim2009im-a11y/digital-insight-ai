// إعداد ربط بيتِيّ بقاعدة بيانات Supabase.
// اترك القيم فارغة ليعمل التطبيق محلياً عبر localStorage.
// بعد إنشاء مشروع Supabase وتنفيذ ملف supabase/baiti-schema.sql، ضع القيم هنا.

window.BAITI_CONFIG = {
  backend: 'supabase', // الخيارات: 'local' أو 'supabase'
  supabaseUrl: '', // مثال: https://xxxxxxxxxxxx.supabase.co
  supabaseAnonKey: '', // ضع anon / publishable key فقط، لا تضع service_role أبداً في الواجهة
  tableName: 'baiti_app_state',
  stateId: 'public-demo'
};
