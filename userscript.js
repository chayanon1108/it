// =================================================================
//                 IT HELPDESK - USER SCRIPT (IMPROVED V28 - Upload Fix)
// =================================================================

// --- 1. GLOBAL CONSTANTS & ELEMENTS ---
const API_URL = 'api.php';

// --- DOM Elements ---
const sidebar = document.querySelector('.sidebar');
const menuToggle = document.getElementById('menuToggle');
const currentPageTitle = document.getElementById('currentPageTitle');
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const htmlElement = document.documentElement;
const notificationBadge = document.getElementById('notificationBadge');
const logoutButton = document.getElementById('logoutButton');

// Modals
const allModals = document.querySelectorAll('.modal');
const newRepairModal = document.getElementById('newRepairModal');
const viewRepairModal = document.getElementById('viewRepairModal');
const borrowReturnModal = document.getElementById('borrowReturnModal');
const viewBorrowReturnDetailModal = document.getElementById('viewBorrowReturnDetailModal');
const requestDeviceModal = document.getElementById('requestDeviceModal');
const viewRequestDeviceDetailModal = document.getElementById('viewRequestDeviceDetailModal');
const customAlertConfirmModal = document.getElementById('customAlertConfirmModal');
const imageLightboxModal = document.getElementById('imageLightboxModal');
const lightboxImage = document.getElementById('lightboxImage');
const lightboxCaption = document.getElementById('lightboxCaption');
const closeLightboxButton = document.querySelector('.close-lightbox-button');

// Forms
const newRepairForm = document.getElementById('newRepairForm');
const borrowReturnForm = document.getElementById('borrowReturnForm');
const requestDeviceForm = document.getElementById('requestDeviceForm');

// History Page Elements
const userHistoryTypeFilter = document.getElementById('userHistoryTypeFilter');
const userHistoryStatusFilter = document.getElementById('userHistoryStatusFilter');
const userHistoryDateFilter = document.getElementById('userHistoryDateFilter');

// --- Global Data Storage ---
let allRequests = [];
let repairCategories = [];
let allDevices = [];
let currentUser = {};

// --- Pagination State ---
let repairCurrentPage = 1;
const repairItemsPerPage = 5;
let borrowReturnCurrentPage = 1;
const borrowReturnItemsPerPage = 5;


// --- 2. CORE UI & API FUNCTIONS ---

async function callApi(action, method = 'GET', body = null) {
    const options = {
        method: method,
        headers: { 'Content-Type': 'application/json' },
    };
    if (body) {
        options.body = JSON.stringify(body);
    }
    try {
        const response = await fetch(`${API_URL}?action=${action}`, options);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
        }
        const result = await response.json();
        return result; 
    } catch (error) {
        console.error('API call failed:', action, error);
        throw error;
    }
}

async function loadInitialData() {
    try {
        const result = await callApi('getAllData');
        if (result && result.status === 'success' && result.data) {
            const data = result.data;
            allRequests = data.requests || [];
            repairCategories = data.categories || [];
            allDevices = data.devices || [];
            
            renderDashboard();
            updateNotificationBadge();
            populateCategoryDropdown();
            populateUserHistoryStatusFilter();
        } else {
            throw new Error(result.message || 'Failed to load initial data.');
        }
    } catch (error) {
        console.error('Error loading initial data:', error);
        showCustomAlert('ข้อผิดพลาด', `ไม่สามารถโหลดข้อมูลเริ่มต้นได้: ${error.message}`, 'alert');
    }
}

async function checkUserSession() {
    try {
        const result = await callApi('checkSession');
        if (result && result.status === 'success') {
            currentUser = result.user;
            
            document.querySelector('.user-profile .user-name').textContent = currentUser.fullname;
            document.querySelector('.user-profile .user-role').textContent = currentUser.position || 'ผู้ใช้งาน';
            const userAvatar = document.querySelector('.user-profile .user-avatar');
            if (currentUser.fullname) {
                const initials = currentUser.fullname.split(' ').map(n => n[0]).join('');
                userAvatar.textContent = initials.substring(0, 2).toUpperCase();
            }

            await loadInitialData();
        } else {
            throw new Error(result.message || 'Invalid session.');
        }
    } catch (error) {
        console.error('Session check failed:', error.message);
        showCustomAlert('การยืนยันตัวตนล้มเหลว', 'กรุณาเข้าสู่ระบบอีกครั้ง', 'alert', () => {
             window.location.href = 'login.html';
        });
    }
}

function showSection(sectionIdToShow) {
    document.querySelectorAll('.main-content .section-container').forEach(section => {
        section.style.display = 'none';
        section.classList.remove('active');
    });
    const section = document.getElementById(sectionIdToShow);
    if (section) {
        section.style.display = 'block';
        section.classList.add('active');
    }

    if (sectionIdToShow === 'historySection') {
        applyUserHistoryFilters();
    }
}

function setActiveMenuItem(menuItemId) {
    document.querySelectorAll('.sidebar .menu-item').forEach(item => {
        item.classList.remove('active');
    });

    if (menuItemId) {
        const menuItem = document.getElementById(menuItemId);
        if (menuItem) {
            menuItem.classList.add('active');
            const titleSpan = menuItem.querySelector('span');
            if(titleSpan) {
                currentPageTitle.textContent = titleSpan.textContent;
            }
        }
    }
}

// --- 3. MODAL & ALERT MANAGEMENT ---

function openModal(modalElement) {
    if (!modalElement) return;
    modalElement.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(modalElement) {
    if (!modalElement) return;
    modalElement.classList.remove('active');
    document.body.style.overflow = 'auto';

    const form = modalElement.querySelector('form');
    if (form) form.reset();

    if (modalElement.id === 'newRepairModal') {
        const fileUploadArea = modalElement.querySelector('.file-upload-area');
        const imagePreview = modalElement.querySelector('#imagePreview');
        const removeImageBtn = modalElement.querySelector('.remove-image-btn');
        if (fileUploadArea) {
            fileUploadArea.classList.remove('has-image');
            imagePreview.src = '#';
            removeImageBtn.style.display = 'none';
        }
    }

    const otherCategoryGroup = document.getElementById('otherCategoryGroup');
    if (otherCategoryGroup) {
        otherCategoryGroup.style.display = 'none';
    }
}

function showCustomAlert(title, message, type = 'alert', callback = null) {
    const modal = customAlertConfirmModal;
    modal.querySelector('#customAlertConfirmTitle').textContent = title;
    modal.querySelector('#customAlertConfirmMessage').textContent = message;
    const footer = modal.querySelector('#customAlertConfirmFooter');
    footer.innerHTML = ''; 

    if (type === 'confirm') {
        const confirmButton = document.createElement('button');
        confirmButton.textContent = 'ยืนยัน';
        confirmButton.className = 'submit-button';
        confirmButton.onclick = () => { 
            closeModal(modal); 
            if (callback) callback(); 
        };
        
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'ยกเลิก';
        cancelButton.className = 'cancel-button';
        cancelButton.onclick = () => closeModal(modal);
        
        footer.appendChild(cancelButton);
        footer.appendChild(confirmButton);
    } else { 
        const okButton = document.createElement('button');
        okButton.textContent = 'ตกลง';
        okButton.className = 'submit-button';
        okButton.onclick = () => { 
            closeModal(modal); 
            if (callback) callback(); 
        };
        footer.appendChild(okButton);
    }
    openModal(modal);
}

function showCustomConfirm(title, message, onConfirm) {
    showCustomAlert(title, message, 'confirm', onConfirm);
}

function openImageLightbox(src, caption) {
    if (src && imageLightboxModal) {
        lightboxImage.src = src;
        lightboxCaption.textContent = caption;
        openModal(imageLightboxModal);
    }
}

// --- 4. THEME MANAGEMENT ---

function setTheme(theme) {
    htmlElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// --- 5. RENDERING FUNCTIONS ---

function renderDashboard() {
    renderDashboardStats();
    renderRepairRequestsTable();
    renderBorrowReturnRequestsTable();
    renderLimitedRecentRequestsTable('เบิกอุปกรณ์', 'requestDeviceTableContainer', 5);
}

function renderDashboardStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const userRequests = allRequests;

    const newToday = userRequests.filter(req => {
        const reqDate = new Date(req.created_at);
        reqDate.setHours(0, 0, 0, 0);
        return reqDate.getTime() === today.getTime();
    }).length;

    const inProgress = userRequests.filter(req => ['อยู่ระหว่างดำเนินการ', 'อนุมัติแล้ว', 'รออนุมัติ', 'รอดำเนินการ'].includes(req.status)).length;
    const borrowed = userRequests.filter(req => req.request_type === 'ยืม-คืนอุปกรณ์' && req.status === 'อนุมัติแล้ว').length;
    const completedToday = userRequests.filter(req => {
        if (!['เสร็จสิ้น', 'คืนแล้ว'].includes(req.status) || !req.history || req.history.length === 0) return false;
        const lastHistory = req.history[req.history.length - 1];
        const [datePart] = lastHistory.date.split(' ');
        const [day, month, year] = datePart.split('/');
        const completedDate = new Date(year - 543, month - 1, day);
        return completedDate.getTime() === today.getTime();
    }).length;

    document.getElementById('newRepairsToday').textContent = newToday;
    document.getElementById('inProgressRepairs').textContent = inProgress;
    document.getElementById('borrowedDevicesCount').textContent = borrowed;
    document.getElementById('completedRepairsToday').textContent = completedToday;
}

function renderRepairRequestsTable() {
    const container = document.getElementById('repairTableContainer');
    if (!container) return;

    const repairEntries = allRequests
        .filter(req => req.request_type === 'แจ้งซ่อม')
        .sort((a, b) => b.id - a.id); 

    if (repairEntries.length === 0) {
        const colspan = container.closest('table').querySelector('thead tr').cells.length;
        container.innerHTML = `<tr><td colspan="${colspan}" class="empty-state">ยังไม่มีรายการแจ้งซ่อม</td></tr>`;
        document.getElementById('repairPaginationContainer').innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(repairEntries.length / repairItemsPerPage);
    if (repairCurrentPage > totalPages && totalPages > 0) {
        repairCurrentPage = totalPages;
    }
    const startIndex = (repairCurrentPage - 1) * repairItemsPerPage;
    const endIndex = startIndex + repairItemsPerPage;
    const paginatedItems = repairEntries.slice(startIndex, endIndex);

    container.innerHTML = paginatedItems.map(entry => getTableRowHtml(entry)).join('');
    attachTableButtonListeners(container);
    renderRepairPagination(totalPages);
}

function renderRepairPagination(totalPages) {
    const paginationContainer = document.getElementById('repairPaginationContainer');
    if (!paginationContainer) return;
    paginationContainer.innerHTML = '';

    if (totalPages <= 1) return;

    const prevButton = document.createElement('button');
    prevButton.innerHTML = '&laquo;';
    prevButton.className = 'pagination-button';
    prevButton.disabled = repairCurrentPage === 1;
    prevButton.addEventListener('click', () => {
        if (repairCurrentPage > 1) {
            repairCurrentPage--;
            renderRepairRequestsTable();
        }
    });
    paginationContainer.appendChild(prevButton);

    for (let i = 1; i <= totalPages; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.className = 'pagination-button';
        if (i === repairCurrentPage) {
            pageButton.classList.add('active');
        }
        pageButton.addEventListener('click', () => {
            repairCurrentPage = i;
            renderRepairRequestsTable();
        });
        paginationContainer.appendChild(pageButton);
    }

    const nextButton = document.createElement('button');
    nextButton.innerHTML = '&raquo;';
    nextButton.className = 'pagination-button';
    nextButton.disabled = repairCurrentPage === totalPages;
    nextButton.addEventListener('click', () => {
        if (repairCurrentPage < totalPages) {
            repairCurrentPage++;
            renderRepairRequestsTable();
        }
    });
    paginationContainer.appendChild(nextButton);
}

function renderBorrowReturnRequestsTable() {
    const container = document.getElementById('borrowReturnTableContainer');
    if (!container) return;

    const borrowEntries = allRequests
        .filter(req => req.request_type === 'ยืม-คืนอุปกรณ์')
        .sort((a, b) => b.id - a.id);

    if (borrowEntries.length === 0) {
        const colspan = container.closest('table').querySelector('thead tr').cells.length;
        container.innerHTML = `<tr><td colspan="${colspan}" class="empty-state">ยังไม่มีรายการยืม-คืน</td></tr>`;
        document.getElementById('borrowReturnPaginationContainer').innerHTML = '';
        return;
    }

    const totalPages = Math.ceil(borrowEntries.length / borrowReturnItemsPerPage);
     if (borrowReturnCurrentPage > totalPages && totalPages > 0) {
        borrowReturnCurrentPage = totalPages;
    }
    const startIndex = (borrowReturnCurrentPage - 1) * borrowReturnItemsPerPage;
    const endIndex = startIndex + borrowReturnItemsPerPage;
    const paginatedItems = borrowEntries.slice(startIndex, endIndex);

    container.innerHTML = paginatedItems.map(entry => getTableRowHtml(entry)).join('');
    attachTableButtonListeners(container);
    renderBorrowReturnPagination(totalPages);
}

function renderBorrowReturnPagination(totalPages) {
    const paginationContainer = document.getElementById('borrowReturnPaginationContainer');
    if (!paginationContainer) return;
    paginationContainer.innerHTML = '';

    if (totalPages <= 1) return;

    const prevButton = document.createElement('button');
    prevButton.innerHTML = '&laquo;';
    prevButton.className = 'pagination-button';
    prevButton.disabled = borrowReturnCurrentPage === 1;
    prevButton.addEventListener('click', () => {
        if (borrowReturnCurrentPage > 1) {
            borrowReturnCurrentPage--;
            renderBorrowReturnRequestsTable();
        }
    });
    paginationContainer.appendChild(prevButton);

    for (let i = 1; i <= totalPages; i++) {
        const pageButton = document.createElement('button');
        pageButton.textContent = i;
        pageButton.className = 'pagination-button';
        if (i === borrowReturnCurrentPage) {
            pageButton.classList.add('active');
        }
        pageButton.addEventListener('click', () => {
            borrowReturnCurrentPage = i;
            renderBorrowReturnRequestsTable();
        });
        paginationContainer.appendChild(pageButton);
    }

    const nextButton = document.createElement('button');
    nextButton.innerHTML = '&raquo;';
    nextButton.className = 'pagination-button';
    nextButton.disabled = borrowReturnCurrentPage === totalPages;
    nextButton.addEventListener('click', () => {
        if (borrowReturnCurrentPage < totalPages) {
            borrowReturnCurrentPage++;
            renderBorrowReturnRequestsTable();
        }
    });
    paginationContainer.appendChild(nextButton);
}

function renderLimitedRecentRequestsTable(type, containerId, limit) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const entries = allRequests
        .filter(req => req.request_type === type)
        .sort((a, b) => b.id - a.id)
        .slice(0, limit);

    if (entries.length === 0) {
        const colspan = container.closest('table').querySelector('thead tr').cells.length;
        container.innerHTML = `<tr><td colspan="${colspan}" class="empty-state">ยังไม่มีรายการ</td></tr>`;
        return;
    }

    container.innerHTML = entries.map(entry => getTableRowHtml(entry)).join('');
    attachTableButtonListeners(container);
}

/**
 * สร้าง HTML สำหรับแถวในตาราง (table row) จากข้อมูลคำขอ
 * ฟังก์ชันนี้ถูกออกแบบมาเพื่อสร้างโครงสร้าง 8 คอลัมน์ที่สอดคล้องกันสำหรับทุกประเภทของคำขอ
 * @param {object} entry - อ็อบเจกต์ข้อมูลคำขอ
 * @returns {string} - โค้ด HTML ของ <tr>
 */
function getTableRowHtml(entry) {
    const statusBadge = `<span class="status-badge ${mapStatusToCssClass(entry.status)}">${entry.status}</span>`;
    const canModify = ['รอดำเนินการ', 'รออนุมัติ'].includes(entry.status);
    
    // สร้าง HTML สำหรับปุ่ม Actions
    const actions = `
        <td data-label="ดำเนินการ" class="actions">
            <button class="action-button view-button" data-entry-id="${entry.id}" title="ดูรายละเอียด"><i class="fas fa-eye"></i></button>
            ${canModify ? `<button class="action-button edit-button" data-entry-id="${entry.id}" title="แก้ไข"><i class="fas fa-pencil-alt"></i></button>` : ''}
            ${canModify ? `<button class="action-button delete-button" data-entry-id="${entry.id}" title="ลบ"><i class="fas fa-trash-alt"></i></button>` : ''}
        </td>`;

    // เตรียมข้อมูลสำหรับแต่ละคอลัมน์
    let col3_subject = '';
    let col4_category = '';
    let col6_date_start = '';
    let col7_date_end = '';

    switch (entry.request_type) {
        case 'แจ้งซ่อม':
            const category = repairCategories.find(c => c.id == entry.category_id);
            col3_subject = entry.subject || 'N/A';
            col4_category = entry.category_id ? (category ? category.name : 'N/A') : (entry.other_category_details || 'N/A');
            col6_date_start = formatDate(entry.created_at);
            col7_date_end = entry.assignee || '-';
            break;
        case 'ยืม-คืนอุปกรณ์':
            col3_subject = entry.device_list || 'N/A';
            col4_category = entry.total_quantity > 0 ? `${entry.total_quantity} รายการ` : '-';
            col6_date_start = entry.borrow_date;
            col7_date_end = entry.expected_return_date;
            break;
        case 'เบิกอุปกรณ์':
            col3_subject = entry.device_list || 'N/A';
            col4_category = entry.total_quantity > 0 ? `${entry.total_quantity} รายการ` : '-';
            col6_date_start = entry.request_date;
            col7_date_end = entry.assignee || '-'; // ใช้คอลัมน์นี้แสดงผู้รับผิดชอบเพื่อให้ตารางตรงกัน
            break;
    }

    // สร้าง HTML ของแถวโดยใช้โครงสร้างที่เป็นมาตรฐานเดียวกัน
    return `
        <tr>
            <td data-label="เลขที่">${entry.display_id}</td>
            <td data-label="ผู้แจ้ง/ผู้ยืม">${entry.requester_name}</td>
            <td data-label="หัวข้อ/อุปกรณ์">${col3_subject}</td>
            <td data-label="หมวดหมู่/จำนวน">${col4_category}</td>
            <td data-label="สถานะ">${statusBadge}</td>
            <td data-label="วันที่แจ้ง/ยืม">${col6_date_start}</td>
            <td data-label="ผู้รับผิดชอบ/วันที่คืน">${col7_date_end}</td>
            ${actions}
        </tr>`;
}


function attachTableButtonListeners(container) {
    container.querySelectorAll('.action-button[data-entry-id]').forEach(button => {
        const id = button.dataset.entryId;
        const entry = allRequests.find(e => e.id == id);
        if (!entry) return;

        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);

        if (newButton.classList.contains('view-button')) {
            newButton.onclick = () => openViewModal(entry);
        }
        if (newButton.classList.contains('edit-button')) {
            newButton.onclick = () => openEditModal(entry);
        }
        if (newButton.classList.contains('delete-button')) {
            newButton.onclick = () => showCustomConfirm('ยืนยันการลบ', `คุณต้องการลบรายการ #${entry.display_id} หรือไม่?`, () => deleteEntry(id));
        }
    });
}

// --- 6. FORM & MODAL LOGIC ---

function openViewModal(entry) {
    switch (entry.request_type) {
        case 'แจ้งซ่อม':
            populateViewRepairModal(entry);
            openModal(viewRepairModal);
            break;
        case 'ยืม-คืนอุปกรณ์':
            populateViewBorrowReturnModal(entry);
            openModal(viewBorrowReturnDetailModal);
            break;
        case 'เบิกอุปกรณ์':
            populateViewRequestDeviceModal(entry);
            openModal(viewRequestDeviceDetailModal);
            break;
    }
}

async function openEditModal(entry) {
    try {
        const result = await callApi('getRequestWithDetails', 'POST', { id: entry.id });
        if (!result || result.status !== 'success' || !result.data) {
            throw new Error(result.message || 'Could not fetch details for editing.');
        }

        const fullEntry = result.data;

        switch (fullEntry.request_type) {
            case 'แจ้งซ่อม':
                populateEditRepairModal(fullEntry);
                break;
            case 'ยืม-คืนอุปกรณ์':
                populateEditBorrowReturnModal(fullEntry, 'borrow');
                break;
            case 'เบิกอุปกรณ์':
                populateEditBorrowReturnModal(fullEntry, 'withdraw');
                break;
        }
    } catch (error) {
        showCustomAlert('ข้อผิดพลาด', `ไม่สามารถเปิดหน้าแก้ไขได้: ${error.message}`, 'alert');
    }
}

function populateEditRepairModal(entry) {
    openNewRepairModal(); 

    document.getElementById('newRepairModalTitle').textContent = `แก้ไขงานแจ้งซ่อม #${entry.display_id}`;
    document.getElementById('submitRepairBtn').querySelector('span').textContent = 'บันทึกการแก้ไข';
    
    document.getElementById('repairEntryId').value = entry.id;

    document.getElementById('repairTitle').value = entry.subject;
    document.getElementById('repairLocation').value = entry.location;
    document.getElementById('repairDetails').value = entry.description;

    const categorySelect = document.getElementById('repairCategory');
    const otherCategoryGroup = document.getElementById('otherCategoryGroup');
    const otherCategoryInput = document.getElementById('otherCategory');

    if (entry.category_id) {
        categorySelect.value = entry.category_id;
        otherCategoryGroup.style.display = 'none';
    } else {
        categorySelect.value = 'อื่นๆ';
        otherCategoryGroup.style.display = 'block';
        otherCategoryInput.value = entry.other_category_details;
    }

    const fileUploadArea = document.querySelector('.file-upload-area');
    const imagePreview = document.getElementById('imagePreview');
    const removeImageBtn = document.querySelector('.remove-image-btn');
    if (entry.image_data) {
        imagePreview.src = entry.image_data;
        fileUploadArea.classList.add('has-image');
        removeImageBtn.style.display = 'inline-block';
    }
}

function populateEditBorrowReturnModal(entry, type) {
    const isBorrow = type === 'borrow';
    
    if (isBorrow) {
        openBorrowReturnModal();
    } else {
        openRequestDeviceModal();
    }

    if (isBorrow) {
        document.getElementById('borrowReturnModalTitle').textContent = `แก้ไขรายการยืม #${entry.display_id}`;
        document.getElementById('submitBorrowReturnBtn').textContent = 'บันทึกการแก้ไข';
        document.getElementById('borrowReturnEntryId').value = entry.id;
        document.getElementById('borrowReason').value = entry.purpose;
        flatpickr(document.getElementById('returnDate'), { 
            locale: 'th', 
            dateFormat: "d/m/Y", 
            minDate: "today",
            defaultDate: entry.expected_return_date 
        });
    } else {
        document.getElementById('requestDeviceModalTitle').textContent = `แก้ไขรายการเบิก #${entry.display_id}`;
        document.getElementById('submitRequestDeviceBtn').textContent = 'บันทึกการแก้ไข';
        document.getElementById('requestEntryId').value = entry.id;
        document.getElementById('requestReason').value = entry.purpose;
    }

    const deviceContainer = isBorrow ? document.getElementById('deviceListContainer') : document.getElementById('requestDeviceListContainer');
    renderDeviceSelector(deviceContainer, type, entry.devices);
}

function openNewRepairModal() {
    newRepairForm.reset();
    document.getElementById('newRepairModalTitle').textContent = 'แจ้งซ่อมใหม่';
    document.getElementById('submitRepairBtn').querySelector('span').textContent = 'แจ้งซ่อม';
    document.getElementById('repairEntryId').value = '';

    document.getElementById('reporterName').value = currentUser.fullname || '';
    document.getElementById('reporterDepartment').value = currentUser.department || '';
    document.getElementById('reporterPosition').value = currentUser.position || '';
    document.getElementById('reporterContact').value = currentUser.contact || '';

    openModal(newRepairModal);
}

function populateCategoryDropdown() {
    const categorySelect = document.getElementById('repairCategory');
    categorySelect.innerHTML = '<option value="">-- เลือกหมวดหมู่ --</option>';
    repairCategories.forEach(category => {
        categorySelect.innerHTML += `<option value="${category.id}">${category.name}</option>`;
    });
    categorySelect.innerHTML += '<option value="อื่นๆ">อื่นๆ</option>';
}

async function handleFormSubmit(event, type) {
    event.preventDefault();

    const isUpdate = !!event.target.querySelector('input[type="hidden"]').value;
    const action = isUpdate ? 'updateUserRequest' : 'createRequest';
    let entryData = {};
    let modalToClose;
    let successMessage;
    let submitBtn;

    if (type === 'repair') {
        modalToClose = newRepairModal;
        submitBtn = document.getElementById('submitRepairBtn');
        const categoryValue = document.getElementById('repairCategory').value;
        entryData = {
            id: document.getElementById('repairEntryId').value,
            type: 'แจ้งซ่อม',
            requesterName: document.getElementById('reporterName').value,
            requesterDepartment: document.getElementById('reporterDepartment').value,
            requesterContact: document.getElementById('reporterContact').value,
            subject: document.getElementById('repairTitle').value.trim(),
            description: document.getElementById('repairDetails').value.trim(),
            location: document.getElementById('repairLocation').value.trim(),
            category_id: categoryValue !== 'อื่นๆ' ? categoryValue : null,
            otherCategory: categoryValue === 'อื่นๆ' ? document.getElementById('otherCategory').value.trim() : '',
            imageData: null,
        };
        if (!isUpdate) entryData.requestDate = getThaiFormattedDate();
        successMessage = isUpdate ? 'แก้ไขข้อมูลเรียบร้อยแล้ว' : 'แจ้งซ่อมเรียบร้อยแล้ว';
        
        const imageFile = document.getElementById('repairImage').files[0];
        if (imageFile) {
            try {
                entryData.imageData = await resizeImage(imageFile, 1024, 1024, 0.8);
            } catch (error) {
                showCustomAlert('ข้อผิดพลาด', 'ไม่สามารถประมวลผลรูปภาพได้', 'alert');
                return;
            }
        } else if (isUpdate) {
            const imagePreview = document.getElementById('imagePreview');
            if (imagePreview.src && !imagePreview.src.endsWith('#')) {
                 entryData.imageData = imagePreview.src;
            }
        }

    } else if (type === 'borrow') {
        modalToClose = borrowReturnModal;
        submitBtn = document.getElementById('submitBorrowReturnBtn');
        entryData = {
            id: document.getElementById('borrowReturnEntryId').value,
            type: 'ยืม-คืนอุปกรณ์',
            requesterName: document.getElementById('borrowerName').value,
            requesterDepartment: document.getElementById('borrowerDepartment').value,
            requesterContact: document.getElementById('borrowerContact').value,
            purpose: document.getElementById('borrowReason').value.trim(),
            expectedReturnDate: document.getElementById('returnDate').value,
            devices: getSelectedDevices(document.getElementById('deviceListContainer')),
        };
        if (!isUpdate) entryData.borrowDate = getThaiFormattedDate();
        successMessage = isUpdate ? 'แก้ไขข้อมูลเรียบร้อยแล้ว' : 'ส่งคำขอยืมเรียบร้อยแล้ว';

    } else if (type === 'withdraw') {
        modalToClose = requestDeviceModal;
        submitBtn = document.getElementById('submitRequestDeviceBtn');
        entryData = {
            id: document.getElementById('requestEntryId').value,
            type: 'เบิกอุปกรณ์',
            requesterName: document.getElementById('requesterName').value,
            requesterDepartment: document.getElementById('requesterDepartment').value,
            requesterContact: document.getElementById('requesterContact').value,
            purpose: document.getElementById('requestReason').value.trim(),
            devices: getSelectedDevices(document.getElementById('requestDeviceListContainer')),
        };
        if (!isUpdate) entryData.requestDate = getThaiFormattedDate();
        successMessage = isUpdate ? 'แก้ไขข้อมูลเรียบร้อยแล้ว' : 'ส่งคำขอเบิกเรียบร้อยแล้ว';
    }

    submitBtn.disabled = true;

    try {
        const result = await callApi(action, 'POST', entryData);
        if (result && result.status === 'success') {
            closeModal(modalToClose);
            showCustomAlert('สำเร็จ', successMessage, 'alert', async () => {
                if (isUpdate) {
                    await loadInitialData();
                } else {
                    const newId = result.new_id;
                    try {
                        const newRequestResult = await callApi('getRequestWithDetails', 'POST', { id: newId });
                        if (newRequestResult && newRequestResult.status === 'success') {
                            allRequests.unshift(newRequestResult.data);
                            renderDashboard();
                            updateNotificationBadge();
                        } else {
                            await loadInitialData();
                        }
                    } catch (fetchError) {
                        console.error("Error fetching new request details:", fetchError);
                        await loadInitialData();
                    }
                }
            });
        } else {
            throw new Error(result.message || 'Failed to save request.');
        }
    } catch (error) {
        showCustomAlert('ข้อผิดพลาด', `เกิดข้อผิดพลาด: ${error.message}`, 'alert');
    } finally {
        submitBtn.disabled = false;
    }
}

function populateViewRepairModal(entry) {
    document.getElementById('viewRepairModalTitle').textContent = 'รายละเอียดงานแจ้งซ่อม';
    document.getElementById('viewRepairModalId').textContent = `#${entry.display_id}`;

    document.getElementById('viewRepairTitle').textContent = entry.subject;
    const category = repairCategories.find(c => c.id == entry.category_id);
    document.getElementById('viewRepairCategory').textContent = entry.category_id ? (category ? category.name : 'N/A') : (entry.other_category_details || 'N/A');
    document.getElementById('viewRepairDetails').textContent = entry.description || '-';
    
    const viewImage = document.getElementById('viewRepairImage');
    if (entry.image_data) {
        viewImage.src = entry.image_data;
        viewImage.style.display = 'block';
        viewImage.onclick = () => openImageLightbox(entry.image_data, `รูปภาพสำหรับ #${entry.display_id}`);
    } else {
        viewImage.style.display = 'none';
    }

    const statusBadge = document.getElementById('viewRepairStatus');
    statusBadge.textContent = entry.status;
    statusBadge.className = `status-badge ${mapStatusToCssClass(entry.status)}`;
    document.getElementById('viewRepairDate').textContent = formatDate(entry.created_at);
    document.getElementById('viewRepairAssignee').textContent = entry.assignee || '-';

    const historyList = document.getElementById('viewRepairHistory');
    historyList.innerHTML = entry.history?.map(item => `<li>${item.date} - ${item.action}</li>`).join('') || '<li>ไม่มีประวัติ</li>';

    const footer = document.getElementById('viewRepairModalFooter');
    footer.innerHTML = '';
    if (['รอดำเนินการ', 'รออนุมัติ'].includes(entry.status)) {
        footer.innerHTML = `
            <button type="button" class="submit-button edit-button" style="margin-right: auto;"><i class="fas fa-pencil-alt"></i> แก้ไข</button>
            <button type="button" class="cancel-button" id="deleteRepairFromViewBtn">ลบคำขอ</button>
        `;
        footer.querySelector('.edit-button').onclick = () => {
            closeModal(viewRepairModal);
            openEditModal(entry);
        };
        footer.querySelector('#deleteRepairFromViewBtn').onclick = () => {
             closeModal(viewRepairModal);
             showCustomConfirm('ยืนยันการลบ', `คุณต้องการลบงานแจ้งซ่อม #${entry.display_id} หรือไม่?`, () => deleteEntry(entry.id));
        };
    }
}

function openBorrowReturnModal() {
    borrowReturnForm.reset();
    document.getElementById('borrowReturnModalTitle').textContent = 'ยืม-คืนอุปกรณ์';
    document.getElementById('submitBorrowReturnBtn').textContent = 'ส่งคำขอยืม';
    document.getElementById('borrowReturnEntryId').value = '';
    
    document.getElementById('borrowerName').value = currentUser.fullname;
    document.getElementById('borrowerDepartment').value = currentUser.department;
    document.getElementById('borrowerContact').value = currentUser.contact;

    flatpickr(document.getElementById('returnDate'), { locale: 'th', dateFormat: "d/m/Y", minDate: "today" });
    renderDeviceSelector(document.getElementById('deviceListContainer'), 'borrow');
    openModal(borrowReturnModal);
}

function openRequestDeviceModal() {
    requestDeviceForm.reset();
    document.getElementById('requestDeviceModalTitle').textContent = 'เบิกอุปกรณ์';
    document.getElementById('submitRequestDeviceBtn').textContent = 'ส่งคำขอเบิก';
    document.getElementById('requestEntryId').value = '';

    document.getElementById('requesterName').value = currentUser.fullname;
    document.getElementById('requesterDepartment').value = currentUser.department;
    document.getElementById('requesterContact').value = currentUser.contact;

    renderDeviceSelector(document.getElementById('requestDeviceListContainer'), 'withdraw');
    openModal(requestDeviceModal);
}

function renderDeviceSelector(container, deviceType, selectedDevices = []) {
    container.innerHTML = '';
    const availableDevices = allDevices.filter(d => d.device_type === deviceType);

    if (availableDevices.length === 0) {
        container.innerHTML = '<p class="empty-state">ไม่มีอุปกรณ์ให้เลือกในขณะนี้</p>';
        return;
    }
    availableDevices.forEach(device => {
        const card = document.createElement('div');
        card.className = 'device-card';
        card.dataset.deviceId = device.id;

        const preSelected = selectedDevices.find(d => d.device_id == device.id);
        const preSelectedQty = preSelected ? preSelected.quantity : 0;

        const imgSrc = device.image_data || 'https://placehold.co/80x80/E0E7FF/2970FF?text=No+Img';
        
        const maxQty = device.available_quantity + preSelectedQty;

        card.innerHTML = `
            <img src="${imgSrc}" alt="${device.name}" onerror="this.onerror=null;this.src='https://placehold.co/80x80/E0E7FF/2970FF?text=Error';">
            <div class="device-info">
                ${device.name}
                <div class="model">${device.brand || ''} (คงเหลือ: ${device.available_quantity})</div>
            </div>
            <div class="device-quantity" style="display: ${preSelectedQty > 0 ? 'flex' : 'none'};">
                <button type="button" class="quantity-button minus-btn">-</button>
                <input type="number" class="quantity-input" value="${preSelectedQty}" min="0" max="${maxQty}" readonly>
                <button type="button" class="quantity-button plus-btn">+</button>
            </div>
        `;
        
        if (preSelectedQty > 0) {
            card.classList.add('selected');
        }
        
        const imgElement = card.querySelector('img');
        imgElement.addEventListener('click', (e) => {
            e.stopPropagation();
            openImageLightbox(imgSrc, `${device.name} - ${device.brand || ''}`);
        });

        container.appendChild(card);
    });
}

function handleDeviceCardClick(event) {
    if (event.target.tagName === 'IMG') {
        return;
    }

    const card = event.target.closest('.device-card');
    if (!card) return;

    const quantityControl = card.querySelector('.device-quantity');
    const quantityInput = card.querySelector('.quantity-input');
    const maxQty = parseInt(quantityInput.max);

    if (!event.target.closest('.device-quantity')) {
        card.classList.toggle('selected');
        const isSelected = card.classList.contains('selected');
        quantityControl.style.display = isSelected ? 'flex' : 'none';
        quantityInput.value = isSelected ? '1' : '0';
    }

    if (event.target.classList.contains('plus-btn')) {
        let currentVal = parseInt(quantityInput.value);
        if (currentVal < maxQty) {
            quantityInput.value = currentVal + 1;
        }
    } else if (event.target.classList.contains('minus-btn')) {
        let currentVal = parseInt(quantityInput.value);
        if (currentVal > 1) {
            quantityInput.value = currentVal - 1;
        } else {
            quantityInput.value = 0;
            card.classList.remove('selected');
            quantityControl.style.display = 'none';
        }
    }
}

function getSelectedDevices(container) {
    const devices = [];
    container.querySelectorAll('.device-card.selected').forEach(card => {
        const quantity = parseInt(card.querySelector('.quantity-input').value);
        if (quantity > 0) {
            devices.push({
                id: card.dataset.deviceId,
                quantity: quantity
            });
        }
    });
    return devices;
}

function populateViewBorrowReturnModal(entry) {
    document.getElementById('viewBorrowReturnModalTitle').textContent = 'รายละเอียดการยืม-คืน';
    document.getElementById('viewBorrowReturnModalId').textContent = `#${entry.display_id}`;

    document.getElementById('viewBorrowerName').textContent = entry.requester_name;
    document.getElementById('viewBorrowerDepartment').textContent = entry.requester_department;
    document.getElementById('viewBorrowerContact').textContent = entry.requester_contact;
    document.getElementById('viewBorrowedDevices').innerHTML = `<li>${entry.device_list || 'N/A'}</li>`;
    document.getElementById('viewBorrowReason').textContent = entry.purpose || '-';
    
    const statusBadge = document.getElementById('viewBorrowReturnStatus');
    statusBadge.textContent = entry.status;
    statusBadge.className = `status-badge ${mapStatusToCssClass(entry.status)}`;
    document.getElementById('viewBorrowDate').textContent = entry.borrow_date;
    document.getElementById('viewReturnDate').textContent = entry.expected_return_date;

    const historyList = document.getElementById('viewBorrowReturnHistory');
    historyList.innerHTML = entry.history?.map(item => `<li>${item.date} - ${item.action}</li>`).join('') || '<li>ไม่มีประวัติ</li>';

    const footer = document.getElementById('viewBorrowReturnModalFooter');
    footer.innerHTML = '';
    if (['รอดำเนินการ', 'รออนุมัติ'].includes(entry.status)) {
        footer.innerHTML = `
            <button type="button" class="submit-button edit-button" style="margin-right: auto;"><i class="fas fa-pencil-alt"></i> แก้ไข</button>
            <button type="button" class="cancel-button" id="deleteBorrowFromViewBtn">ลบคำขอ</button>
        `;
        footer.querySelector('.edit-button').onclick = () => {
            closeModal(viewBorrowReturnDetailModal);
            openEditModal(entry);
        };
        footer.querySelector('#deleteBorrowFromViewBtn').onclick = () => {
            closeModal(viewBorrowReturnDetailModal);
            showCustomConfirm('ยืนยันการลบ', `คุณต้องการลบรายการยืม-คืน #${entry.display_id} หรือไม่?`, () => deleteEntry(entry.id));
        };
    }
}

function populateViewRequestDeviceModal(entry) {
    document.getElementById('viewRequestDeviceModalTitle').textContent = 'รายละเอียดการเบิกอุปกรณ์';
    document.getElementById('viewRequestDeviceModalId').textContent = `#${entry.display_id}`;

    document.getElementById('viewRequesterName').textContent = entry.requester_name;
    document.getElementById('viewRequesterDepartment').textContent = entry.requester_department;
    document.getElementById('viewRequesterContact').textContent = entry.requester_contact;
    document.getElementById('viewRequestedDevices').innerHTML = `<li>${entry.device_list || 'N/A'}</li>`;
    document.getElementById('viewRequestReason').textContent = entry.purpose || '-';

    const statusBadge = document.getElementById('viewRequestStatus');
    statusBadge.textContent = entry.status;
    statusBadge.className = `status-badge ${mapStatusToCssClass(entry.status)}`;
    document.getElementById('viewRequestDate').textContent = entry.request_date;

    const historyList = document.getElementById('viewRequestHistory');
    historyList.innerHTML = entry.history?.map(item => `<li>${item.date} - ${item.action}</li>`).join('') || '<li>ไม่มีประวัติ</li>';

    const footer = document.getElementById('viewRequestDeviceModalFooter');
    footer.innerHTML = '';
    if (['รอดำเนินการ', 'รออนุมัติ'].includes(entry.status)) {
        footer.innerHTML = `
            <button type="button" class="submit-button edit-button" style="margin-right: auto;"><i class="fas fa-pencil-alt"></i> แก้ไข</button>
            <button type="button" class="cancel-button" id="deleteRequestDevFromViewBtn">ลบคำขอ</button>
        `;
        footer.querySelector('.edit-button').onclick = () => {
            closeModal(viewRequestDeviceDetailModal);
            openEditModal(entry);
        };
        footer.querySelector('#deleteRequestDevFromViewBtn').onclick = () => {
            closeModal(viewRequestDeviceDetailModal);
            showCustomConfirm('ยืนยันการลบ', `คุณต้องการลบรายการเบิก #${entry.display_id} หรือไม่?`, () => deleteEntry(entry.id));
        };
    }
}

async function deleteEntry(entryId) {
    try {
        const result = await callApi('deleteRequest', 'POST', { id: entryId });
        if (result && result.status === 'success') {
            showCustomAlert('สำเร็จ', `ลบรายการเรียบร้อยแล้ว`, 'alert', async () => {
                await loadInitialData();
            });
        } else {
            throw new Error(result.message || 'Delete failed.');
        }
    } catch (error) {
        showCustomAlert('ข้อผิดพลาด', `เกิดข้อผิดพลาดในการลบ: ${error.message}`, 'alert');
    }
}


// --- 7. HISTORY PAGE FUNCTIONS ---
function applyUserHistoryFilters() {
    const type = userHistoryTypeFilter.value;
    const status = userHistoryStatusFilter.value;
    const dateRange = userHistoryDateFilter.value;
    let [startDate, endDate] = [null, null];

    if (dateRange) {
        const dates = dateRange.split(' to ');
        startDate = dates[0] ? new Date(dates[0].split('/').reverse().join('-')) : null;
        if(startDate) startDate.setHours(0, 0, 0, 0);
        endDate = dates[1] ? new Date(dates[1].split('/').reverse().join('-')) : null;
        if(endDate) endDate.setHours(23, 59, 59, 999);
    }

    let filtered = allRequests.filter(req => {
        if (type && req.request_type !== type) return false;
        if (status && req.status !== status) return false;
        if (startDate && endDate) {
            const reqDate = new Date(req.created_at);
            if (reqDate < startDate || reqDate > endDate) return false;
        }
        return true;
    });

    renderUserHistoryTable(filtered);
}

function renderUserHistoryTable(entries) {
    const container = document.getElementById('userHistoryTableBody');
    if (!container) return;

    if (entries.length === 0) {
        container.innerHTML = `<tr><td colspan="6" class="empty-state">ไม่พบข้อมูลที่ตรงกับเงื่อนไข</td></tr>`;
        return;
    }

    container.innerHTML = entries.map(entry => {
         const subjectOrDevice = entry.subject || entry.device_list || 'N/A';
         const date = entry.request_date || entry.borrow_date || formatDate(entry.created_at);
         const statusBadge = `<span class="status-badge ${mapStatusToCssClass(entry.status)}">${entry.status}</span>`;
         const canModify = ['รอดำเนินการ', 'รออนุมัติ'].includes(entry.status);
         const actions = `
            <td class="actions" data-label="การดำเนินการ">
                <button class="action-button view-button" data-entry-id="${entry.id}" title="ดูรายละเอียด"><i class="fas fa-eye"></i></button>
                ${canModify ? `<button class="action-button edit-button" data-entry-id="${entry.id}" title="แก้ไข"><i class="fas fa-pencil-alt"></i></button>` : ''}
                ${canModify ? `<button class="action-button delete-button" data-entry-id="${entry.id}" title="ลบ"><i class="fas fa-trash-alt"></i></button>` : ''}
            </td>`;

         return `
            <tr>
                <td data-label="เลขที่">${entry.display_id}</td>
                <td data-label="ประเภท">${entry.request_type}</td>
                <td data-label="หัวข้อ/อุปกรณ์">${subjectOrDevice}</td>
                <td data-label="สถานะ">${statusBadge}</td>
                <td data-label="วันที่">${date}</td>
                ${actions}
            </tr>
         `;
    }).join('');
    attachTableButtonListeners(container);
}

function populateUserHistoryStatusFilter() {
    if (!userHistoryStatusFilter) return;
    const statuses = [...new Set(allRequests.map(r => r.status))];
    userHistoryStatusFilter.innerHTML = '<option value="">ทุกสถานะ</option>';
    statuses.forEach(status => {
        userHistoryStatusFilter.innerHTML += `<option value="${status}">${status}</option>`;
    });
}


// --- 8. UTILITY FUNCTIONS ---

function resizeImage(file, maxWidth, maxHeight, quality) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
            img.src = event.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

function updateNotificationBadge() {
    const unreadCount = allRequests.filter(e => ['อยู่ระหว่างดำเนินการ', 'เสร็จสิ้น', 'คืนแล้ว', 'ไม่อนุมัติ', 'ยกเลิก'].includes(e.status)).length; 
    notificationBadge.textContent = unreadCount;
    notificationBadge.style.display = unreadCount > 0 ? 'block' : 'none';
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear() + 543;
    return `${day}/${month}/${year}`;
}

function getThaiFormattedDate() {
    const date = new Date();
    return formatDate(date.toISOString());
}

function mapStatusToCssClass(status) {
    const statusMap = {
        'รอดำเนินการ': 'pending',
        'รออนุมัติ': 'waiting-approval',
        'อยู่ระหว่างดำเนินการ': 'in-progress',
        'ส่งซ่อมภายนอก': 'external-repair',
        'เสร็จสิ้น': 'completed',
        'อนุมัติแล้ว': 'approved',
        'คืนแล้ว': 'returned',
        'ไม่อนุมัติ': 'rejected',
        'ยกเลิก': 'rejected' 
    };
    return statusMap[status] || status.replace(/\s+/g, '-').toLowerCase();
}


// --- 9. INITIALIZATION & EVENT LISTENERS ---

function initializeEventListeners() {
    // Theme Toggle
    themeToggle.addEventListener('click', () => {
        const newTheme = htmlElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    });

    // Sidebar Navigation
    menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    document.querySelectorAll('.sidebar .menu-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            
            if (item.id === 'logoutButton') {
                showCustomConfirm('ยืนยันการออกจากระบบ', 'คุณต้องการออกจากระบบใช่หรือไม่?', async () => {
                    try {
                        await callApi('logoutUser');
                        window.location.href = 'login.html';
                    } catch (error) {
                        showCustomAlert('ข้อผิดพลาด', 'ไม่สามารถออกจากระบบได้ กรุณาลองอีกครั้ง', 'alert');
                    }
                });
                return;
            }

            const sectionId = item.getAttribute('data-section-id');

            if (sectionId) {
                showSection(sectionId);
                setActiveMenuItem(item.id);
            } else {
                switch (item.id) {
                    case 'newRepairMenuItem': openNewRepairModal(); break;
                    case 'borrowReturnMenuItem': openBorrowReturnModal(); break;
                    case 'requestDeviceMenuItem': openRequestDeviceModal(); break;
                }
            }
             if (window.innerWidth <= 1024) sidebar.classList.remove('open');
        });
    });

    newRepairForm.addEventListener('submit', (e) => handleFormSubmit(e, 'repair'));
    borrowReturnForm.addEventListener('submit', (e) => handleFormSubmit(e, 'borrow'));
    requestDeviceForm.addEventListener('submit', (e) => handleFormSubmit(e, 'withdraw'));

    document.getElementById('repairCategory').addEventListener('change', function() {
        document.getElementById('otherCategoryGroup').style.display = this.value === 'อื่นๆ' ? 'block' : 'none';
    });
    
    const fileUploadArea = document.querySelector('.file-upload-area');
    const repairImageInput = document.getElementById('repairImage');
    const imagePreview = document.getElementById('imagePreview');
    const removeImageBtn = document.querySelector('.remove-image-btn');

    if (fileUploadArea) {
        // ========== START: โค้ดที่แก้ไข - ลบ Event Listener ที่ไม่จำเป็นออก ==========
        // การคลิกจะถูกจัดการโดย <label> ใน HTML โดยตรง ทำให้ไม่ต้องใช้ JavaScript ส่วนนี้
        // fileUploadArea.addEventListener('click', () => repairImageInput.click());
        // ========== END: โค้ดที่แก้ไข ==========
        
        fileUploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileUploadArea.classList.add('dragover');
        });

        fileUploadArea.addEventListener('dragleave', () => {
            fileUploadArea.classList.remove('dragover');
        });

        fileUploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            fileUploadArea.classList.remove('dragover');
            if (e.dataTransfer.files.length) {
                repairImageInput.files = e.dataTransfer.files;
                const changeEvent = new Event('change');
                repairImageInput.dispatchEvent(changeEvent);
            }
        });

        repairImageInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                resizeImage(this.files[0], 400, 400, 0.85).then(dataUrl => {
                    imagePreview.src = dataUrl;
                    fileUploadArea.classList.add('has-image');
                    removeImageBtn.style.display = 'inline-block';
                });
            }
        });

        removeImageBtn.addEventListener('click', (e) => {
            e.stopPropagation(); 
            repairImageInput.value = ''; 
            imagePreview.src = '#';
            fileUploadArea.classList.remove('has-image');
            removeImageBtn.style.display = 'none';
        });
    }

    document.getElementById('deviceListContainer').addEventListener('click', handleDeviceCardClick);
    document.getElementById('requestDeviceListContainer').addEventListener('click', handleDeviceCardClick);

    userHistoryTypeFilter.addEventListener('change', applyUserHistoryFilters);
    userHistoryStatusFilter.addEventListener('change', applyUserHistoryFilters);
    flatpickr(userHistoryDateFilter, {
        mode: "range",
        dateFormat: "d/m/Y",
        locale: "th",
        onChange: function(selectedDates, dateStr, instance) {
            applyUserHistoryFilters();
        }
    });

    allModals.forEach(modal => {
        modal.querySelector('.close-button')?.addEventListener('click', () => closeModal(modal));
        modal.querySelector('.cancel-button')?.addEventListener('click', () => closeModal(modal));
    });
    window.addEventListener('click', (event) => {
        if (event.target.classList.contains('modal') && !event.target.classList.contains('image-lightbox')) {
            closeModal(event.target);
        }
    });

    if (closeLightboxButton) {
        closeLightboxButton.addEventListener('click', () => closeModal(imageLightboxModal));
    }
}

// --- App Entry Point ---
document.addEventListener('DOMContentLoaded', () => {
    setTheme(localStorage.getItem('theme') || 'light');
    initializeEventListeners();
    
    checkUserSession();
    
    showSection('dashboardSection');
    setActiveMenuItem('dashboardMenuItem');
});
