1. src/config/
يحتوي على ملفات ضبط الإعدادات الأساسية للتطبيق:

database.js: إعدادات الاتصال بقاعدة البيانات (مثلاً MongoDB URI، خيارات الاتصال).

env.js: تحميل متغيرات البيئة من ملف .env وتوفيرها للتطبيق.

cloudinary.js: إعدادات وتهيئة خدمة Cloudinary لرفع الصور والفيديوهات.

email.js: إعدادات SMTP أو أي خدمة بريد إلكتروني تُستخدم لإرسال الإيميلات من التطبيق.

2. src/models/
ملفات تعريف الـ Schemas الخاصة بـ MongoDB باستخدام Mongoose:

User.js: نموذج المستخدم (مريض، طبيب، أدمن) مع بياناته وخصائصه.

DoctorSchedule.js: جدول مواعيد الطبيب.

Appointment.js: بيانات الحجز أو المواعيد بين الطبيب والمريض.

Prescription.js: وصفات الأدوية الطبية.

Notification.js: الإشعارات المرسلة للمستخدمين.

Blog.js: نموذج التدوينات (المدونات) التي ينشئها الأطباء أو الأدمن.

3. src/controllers/
ملفات تحوي منطق التعامل مع الطلبات (Request Handlers)، مرتبة حسب دور المستخدم:

auth/:

authController.js: تسجيل الدخول، التسجيل، تسجيل الخروج، واستعادة كلمة المرور.

roleController.js: إدارة أدوار المستخدمين (طبيب، مريض، أدمن).

admin/:

userController.js: إدارة المستخدمين (إضافة، تعديل، حذف).

reportController.js: التقارير والإحصائيات الخاصة بالعيادة.

settingsController.js: إعدادات عامة للعيادة أو التطبيق.

blogController.js: CRUD كامل للتدوينات من قبل الأدمن.

doctor/:

scheduleController.js: إدارة جدول الطبيب.

appointmentController.js: إدارة مواعيد الطبيب.

prescriptionController.js: إدارة الوصفات الطبية.

blogController.js: CRUD للتدوينات من قبل الطبيب.

patient/:

profileController.js: عرض وتحديث بيانات المريض.

appointmentController.js: حجز وإدارة مواعيد المريض.

historyController.js: سجل المريض الطبي.

public/:

doctorController.js: عرض بيانات الأطباء للجمهور.

clinicController.js: عرض معلومات العيادة.

blogController.js: عرض التدوينات المتاحة للعامة (المستخدمين المرضى والزوار).

4. src/routes/
ملفات تحتوي على مسارات (Routes) API للتعامل مع الـ HTTP requests، كل ملف مسؤول عن مجموعة من المسارات:

auth.js: مسارات تسجيل الدخول، التسجيل، الخروج، إلخ.

admin.js: مسارات خاصة بإدارة الأدمن (مثل /admin/blogs، /admin/users).

doctor.js: مسارات للطبيب (مثل /doctor/schedule، /doctor/blogs).

patient.js: مسارات مخصصة للمرضى (مثل /patient/appointments).

public.js: مسارات عامة متاحة للجميع، خاصة لعرض التدوينات والمعلومات العامة.

5. src/middleware/
برامج وسيطة (Middleware) تُستخدم أثناء معالجة الطلبات:

auth.js: التحقق من تسجيل الدخول (JWT أو غيره).

roleAuth.js: التحقق من صلاحيات الدور (أدمن، طبيب، مريض).

validation.js: التحقق من صحة البيانات قبل المرور للـ controller.

upload.js: رفع الصور (مثل صور التدوينات) باستخدام Cloudinary أو غيرها.

errorHandler.js: التقاط ومعالجة الأخطاء التي تحدث أثناء تنفيذ الطلب.

rateLimiter.js: تحديد معدل الطلبات (لحماية API من الهجمات).

softDelete.js: تنفيذ الحذف الناعم (عدم حذف البيانات فعليًا، بل تمييزها كمحذوفة).

6. src/services/
ملفات تحوي منطق العمل مع الخدمات الخارجية والمنطق التجاري (Business Logic):

emailService.js: إرسال الإيميلات.

smsService.js: إرسال الرسائل النصية.

paymentService.js: التعامل مع خدمات الدفع.

notificationService.js: إرسال الإشعارات للمستخدمين.

schedulingService.js: إدارة جداول المواعيد والتذكيرات.

reportService.js: توليد التقارير والإحصائيات.

blog.service.js: منطق التعامل مع التدوينات في قاعدة البيانات (CRUD).

7. src/utils/
أدوات مساعدة عامة تُستخدم في جميع أجزاء المشروع:

helpers.js: دوال مساعدة عامة (مثلاً تنسيق النصوص أو الأرقام).

constants.js: ثوابت (مثل أسماء الأدوار، رموز الحالة).

validators.js: دوال تحقق عامة يمكن استخدامها في أكثر من مكان.

dateUtils.js: دوال خاصة بالتاريخ والوقت.

responseHandler.js: تنسيق الاستجابات API بشكل موحد (نجاح، فشل).

8. src/jobs/
مهام مجدولة (Jobs) تُنفذ بشكل دوري أو مؤقت:

emailJobs.js: إرسال إيميلات مجدولة (مثلاً تذكيرات، إعلانات).

reminderJobs.js: إرسال تذكيرات للمواعيد أو المهام.

cleanupJobs.js: تنظيف البيانات القديمة أو المحذوفة.

9. الملفات الأساسية في الجذر
app.js: الملف الرئيسي لتجهيز التطبيق، تحميل الميدل ويرز، إعداد الراوترات، الاتصال بقاعدة البيانات.

server.js: تشغيل السيرفر (فتح البورت والبدء في استقبال الطلبات).

.env: ملف متغيرات البيئة (سرية، مثل مفاتيح API، كلمات المرور).

.gitignore: تحديد الملفات التي لا تُرفع للـ Git (مثل node_modules/ و .env).

package.json و package-lock.json: ملفات إدارة الحزم والمكتبات المستخدمة.

README.md: ملف توثيقي للمشروع.

10. uploads/
مجلد لتخزين الملفات المرفوعة مؤقتًا (مثل صور التدوينات قبل رفعها إلى Cloudinary).