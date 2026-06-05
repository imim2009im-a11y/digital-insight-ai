// =====================
// سكريبتات JavaScript
// =====================

// التعامل مع نموذج التواصل
const contactForm = document.querySelector('.contact-form');

if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // جمع بيانات النموذج
        const inputs = this.querySelectorAll('input, textarea');
        const data = {
            name: inputs[0].value,
            email: inputs[1].value,
            message: inputs[2].value
        };
        
        // التحقق من صحة البيانات
        if (data.name && data.email && data.message) {
            console.log('تم إرسال البيانات:', data);
            
            // عرض رسالة نجاح
            showNotification('تم إرسال رسالتك بنجاح!', 'success');
            
            // مسح النموذج
            contactForm.reset();
        } else {
            showNotification('يرجى ملء جميع الحقول', 'error');
        }
    });
}

// دالة عرض الإشعارات
function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        font-size: 1rem;
        z-index: 2000;
        animation: slideIn 0.3s ease;
        ${type === 'success' 
            ? 'background-color: #10b981; color: white;' 
            : 'background-color: #ef4444; color: white;'}
    `;
    
    document.body.appendChild(notification);
    
    // إزالة الإشعار بعد 3 ثوان
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// إضافة حركات التمرير الناعمة
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
        const href = this.getAttribute('href');
        if (href !== '#' && document.querySelector(href)) {
            e.preventDefault();
            document.querySelector(href).scrollIntoView({
                behavior: 'smooth'
            });
        }
    });
});

// التعامل مع تغيير حجم النافذة
function handleResponsive() {
    const navLinks = document.querySelector('.nav-links');
    
    if (window.innerWidth <= 768) {
        // إضافة أيقونة القائمة على الأجهزة الصغيرة
        if (!document.querySelector('.menu-toggle')) {
            const menuToggle = document.createElement('button');
            menuToggle.className = 'menu-toggle';
            menuToggle.textContent = '☰';
            document.querySelector('.navbar .container').appendChild(menuToggle);
        }
    }
}

// استدعاء الدالة عند تحميل الصفحة
window.addEventListener('load', handleResponsive);
window.addEventListener('resize', handleResponsive);

// تحريك العناصر عند التمرير
function animateOnScroll() {
    const elements = document.querySelectorAll('.feature-card, .about-content');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.6s ease forwards';
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });
    
    elements.forEach(el => observer.observe(el));
}

// استدعاء دالة الحركة
document.addEventListener('DOMContentLoaded', animateOnScroll);

// إضافة أنماط الحركة (CSS في JavaScript)
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// تسجيل الحدث عند تحميل الصفحة
console.log('Digital Insight AI - تم تحميل الصفحة بنجاح');
