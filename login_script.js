// login_script.js (ฉบับแก้ไข ใช้ Custom Alert ตอน Login สำเร็จ)

document.addEventListener('DOMContentLoaded', () => {
    // --- Get elements ---
    const loginWrapper = document.getElementById('login-wrapper');
    const registerWrapper = document.getElementById('register-wrapper');
    const forgotPasswordWrapper = document.getElementById('forgot-password-wrapper');
    const customAlertModal = document.getElementById('customAlertModal'); // เพิ่มเข้ามา

    const showRegisterLink = document.getElementById('show-register');
    const showForgotPasswordLink = document.getElementById('show-forgot-password');
    const showLoginLinks = document.querySelectorAll('.show-login-link');

    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const forgotPasswordForm = document.getElementById('forgot-password-form');

    // --- Message Box Elements ---
    const loginMessageBox = document.getElementById('login-message-box');
    const registerMessageBox = document.getElementById('register-message-box');
    const forgotMessageBox = document.getElementById('forgot-message-box');

    /**
     * ฟังก์ชันสำหรับแสดงข้อความแจ้งเตือนในฟอร์ม
     */
    const showMessage = (box, message, type) => {
        if (box) {
            box.textContent = message;
            box.className = `message-box ${type}`;
            box.style.display = 'block';
        }
    };

    /**
     * ฟังก์ชันสำหรับซ่อนข้อความแจ้งเตือนในฟอร์ม
     */
    const hideMessage = (box) => {
        if (box) {
            box.style.display = 'none';
        }
    };
    
    /**
     * ฟังก์ชันสำหรับสลับหน้าฟอร์ม
     */
    const switchWrapper = (wrapperToShow) => {
        [loginWrapper, registerWrapper, forgotPasswordWrapper].forEach(wrapper => {
            wrapper.classList.add('hidden');
        });
        if (wrapperToShow) {
            wrapperToShow.classList.remove('hidden');
        }
        [loginMessageBox, registerMessageBox, forgotMessageBox].forEach(hideMessage);
    };

    // ===== START: โค้ดใหม่สำหรับจัดการ Custom Alert =====
    const openModal = (modalElement) => {
        if(modalElement) modalElement.classList.add('active');
    };
    const closeModal = (modalElement) => {
        if(modalElement) modalElement.classList.remove('active');
    };

    const showCustomAlert = (title, message, callback = null) => {
        const modal = customAlertModal;
        if (!modal) return;

        modal.querySelector('#customAlertTitle').textContent = title;
        modal.querySelector('#customAlertMessage').textContent = message;
        const footer = modal.querySelector('#customAlertFooter');
        footer.innerHTML = ''; // Clear previous buttons

        const okButton = document.createElement('button');
        okButton.textContent = 'ตกลง';
        okButton.className = 'auth-button';
        okButton.onclick = () => { 
            closeModal(modal); 
            if (callback) callback(); 
        };
        
        footer.appendChild(okButton);
        openModal(modal);
    };
    // ===== END: โค้ดใหม่สำหรับจัดการ Custom Alert =====

    // --- Event Listeners for switching forms ---
    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            switchWrapper(registerWrapper);
        });
    }

    if (showForgotPasswordLink) {
        showForgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            switchWrapper(forgotPasswordWrapper);
            forgotPasswordForm.reset();
        });
    }

    showLoginLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchWrapper(loginWrapper);
        });
    });

    // --- Handle Login Form Submission ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const submitButton = loginForm.querySelector('button[type="submit"]');
            
            hideMessage(loginMessageBox);
            submitButton.disabled = true;
            submitButton.textContent = 'กำลังตรวจสอบ...';

            try {
                const response = await fetch('api.php?action=loginUser', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const result = await response.json();

                if (response.ok && result.status === 'success') {
                    // ===== START: โค้ดที่แก้ไข (เปลี่ยนไปใช้ Custom Alert) =====
                    const redirectUser = () => {
                        if (result.user.role === 'admin') {
                            window.location.href = 'adminindex.html';
                        } else {
                            window.location.href = 'userindex.html';
                        }
                    };
                    showCustomAlert('เข้าสู่ระบบสำเร็จ', `ยินดีต้อนรับคุณ ${result.user.fullname}`, redirectUser);
                    // ===== END: โค้ดที่แก้ไข =====
                } else {
                    throw new Error(result.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
                }
            } catch (error) {
                // สำหรับข้อผิดพลาด ยังคงแสดงในฟอร์มเหมือนเดิม
                showMessage(loginMessageBox, error.message, 'error');
                submitButton.disabled = false;
                submitButton.textContent = 'เข้าสู่ระบบ';
            }
        });
    }

    // --- Handle Registration Form Submission ---
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-password-confirm').value;
            const submitButton = registerForm.querySelector('button[type="submit"]');

            hideMessage(registerMessageBox);

            if (password.length > 8) {
                showMessage(registerMessageBox, 'รหัสผ่านต้องมีความยาวไม่เกิน 8 ตัวอักษร', 'error');
                return;
            }

            if (password !== confirmPassword) {
                showMessage(registerMessageBox, 'รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน', 'error');
                return;
            }
            
            submitButton.disabled = true;
            submitButton.textContent = 'กำลังสมัคร...';

            const formData = {
                fullname: document.getElementById('register-fullname').value,
                department: document.getElementById('register-department').value,
                position: document.getElementById('register-position').value,
                contact: document.getElementById('register-contact').value,
                email: document.getElementById('register-email').value,
                password: password,
            };

            try {
                const response = await fetch('api.php?action=registerUser', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                const result = await response.json();

                if (response.ok && result.status === 'success') {
                    registerForm.reset();
                    showMessage(registerMessageBox, result.message, 'success');
                    setTimeout(() => {
                        switchWrapper(loginWrapper);
                        showMessage(loginMessageBox, 'สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบด้วยข้อมูลใหม่ของคุณ', 'success');
                    }, 2000);
                } else {
                    throw new Error(result.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
                }
            } catch (error) {
                showMessage(registerMessageBox, error.message, 'error');
            } finally {
                 submitButton.disabled = false;
                 submitButton.textContent = 'สมัครสมาชิก';
            }
        });
    }

    // --- Handle Forgot Password Form Submission ---
    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('forgot-email').value;
            const newPassword = document.getElementById('new-password').value;
            const confirmNewPassword = document.getElementById('confirm-new-password').value;
            const submitButton = forgotPasswordForm.querySelector('button[type="submit"]');

            hideMessage(forgotMessageBox);

            if (newPassword.length > 8) {
                showMessage(forgotMessageBox, 'รหัสผ่านใหม่ต้องมีความยาวไม่เกิน 8 ตัวอักษร', 'error');
                return;
            }
            if (newPassword !== confirmNewPassword) {
                showMessage(forgotMessageBox, 'รหัสผ่านใหม่และการยืนยันไม่ตรงกัน', 'error');
                return;
            }

            submitButton.disabled = true;
            submitButton.textContent = 'กำลังบันทึก...';

            try {
                const response = await fetch('api.php?action=resetPassword', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, newPassword })
                });
                const result = await response.json();

                if (response.ok && result.status === 'success') {
                    forgotPasswordForm.reset();
                    showMessage(forgotMessageBox, result.message, 'success');
                    setTimeout(() => {
                        switchWrapper(loginWrapper);
                        showMessage(loginMessageBox, 'ตั้งรหัสผ่านใหม่สำเร็จแล้ว กรุณาเข้าสู่ระบบ', 'success');
                    }, 2000);
                } else {
                    throw new Error(result.message || 'เกิดข้อผิดพลาด');
                }
            } catch (error) {
                showMessage(forgotMessageBox, error.message, 'error');
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'ตั้งรหัสผ่านใหม่';
            }
        });
    }
});
