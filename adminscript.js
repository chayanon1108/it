// ==================================================================
//         IT HELPDESK - ADMIN SCRIPT (V40 - Add Contact to View Modal)
// ==================================================================

document.addEventListener('DOMContentLoaded', () => {

    // --- 1. GLOBAL CONSTANTS & ELEMENTS ---
    const API_URL = 'api.php';

    // --- DOM Elements ---
    const sidebar = document.querySelector('.sidebar');
    const menuToggle = document.getElementById('menuToggle');
    const pageTitle = document.getElementById('pageTitle');
    const themeToggles = document.querySelectorAll('.theme-toggle-button');
    const htmlElement = document.documentElement;
    const globalSearchInput = document.getElementById('globalSearchInput');

    // Modals
    const allModals = document.querySelectorAll('.modal');
    const viewRequestModal = document.getElementById('viewRequestModal');
    const editRequestModal = document.getElementById('editRequestModal');
    const categoryModal = document.getElementById('categoryModal');
    const deviceModal = document.getElementById('deviceModal');
    const customAlertConfirmModal = document.getElementById('customAlertConfirmModal');
    const imageLightboxModal = document.getElementById('imageLightboxModal');
    const lightboxImage = document.getElementById('lightboxImage');
    const lightboxCaption = document.getElementById('lightboxCaption');
    const partModal = document.getElementById('partModal');
    const editUserModal = document.getElementById('editUserModal');

    // Forms
    const editRequestForm = document.getElementById('editRequestForm');
    const categoryForm = document.getElementById('categoryForm');
    const deviceForm = document.getElementById('deviceForm');
    const partForm = document.getElementById('partForm');
    const editUserForm = document.getElementById('editUserForm');

    // Table Bodies & Containers
    const categoryTableBody = document.getElementById('categoryTableBody');
    const borrowDeviceCardContainer = document.getElementById('borrowDeviceCardContainer');
    const withdrawDeviceCardContainer = document.getElementById('withdrawDeviceCardContainer');
    const partsListContainer = document.getElementById('partsListContainer');
    const userManagementTableBody = document.getElementById('userManagementTableBody');

    // Filters
    const allFilters = document.querySelectorAll('.filters .filter-select');

    // History Section Elements
    const historyTableBody = document.getElementById('historyTableBody');
    const historyTypeFilter = document.getElementById('historyTypeFilter');
    const historyStatusFilter = document.getElementById('historyStatusFilter');
    const historyDateFilter = document.getElementById('historyDateFilter');
    const printHistoryBtn = document.getElementById('printHistoryBtn');


    // --- Global Data Storage ---
    let allRequests = [];
    let repairCategories = [];
    let allDevices = [];
    let allUsers = [];
    let currentAssignees = [];
    let currentParts = [];

    // --- Pagination State ---
    const paginationState = {
        latestRepair: { currentPage: 1, itemsPerPage: 5 },
        latestBorrow: { currentPage: 1, itemsPerPage: 5 },
        latestWithdraw: { currentPage: 1, itemsPerPage: 5 },
    };

    // --- 2. CORE API & UI FUNCTIONS ---

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
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || `HTTP error! status: ${response.status}`);
            }
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
                allRequests = result.data.requests || [];
                repairCategories = result.data.categories || [];
                allDevices = result.data.devices || [];
                allUsers = result.data.users || [];
                currentAssignees = [...new Set(allRequests.map(r => r.assignee).filter(Boolean))];
                
                populateAllFilters();
                renderAllComponents();
            } else {
                 throw new Error(result.message || 'Failed to load initial data.');
            }
        } catch (error) {
             console.error('Error loading initial data:', error);
             showCustomAlert('ข้อผิดพลาด', `ไม่สามารถโหลดข้อมูลเริ่มต้นได้: ${error.message}`, 'alert');
        }
    }

    function renderAllComponents() {
        renderAllTables();
        renderCategoryTable();
        renderDeviceCards();
        updateDashboardStats();
        renderUserManagementTable();
        renderHistoryTable();
    }

    function showSection(sectionId) {
        document.querySelectorAll('.main-content .section-container').forEach(section => section.classList.remove('active'));
        const sectionToShow = document.getElementById(sectionId);
        if (sectionToShow) {
            sectionToShow.classList.add('active');
        }
        
        document.querySelectorAll('.sidebar .menu-item').forEach(item => item.classList.remove('active'));
        const activeMenuItem = document.querySelector(`.sidebar .menu-item[data-section="${sectionId}"]`);
        if (activeMenuItem) {
            activeMenuItem.classList.add('active');
            pageTitle.textContent = activeMenuItem.querySelector('span').textContent;
        }

        globalSearchInput.value = '';
        renderAllComponents();

        if (window.innerWidth <= 1024) {
            sidebar.classList.remove('open');
        }
    }
    
    async function checkUserSession() {
        try {
            const result = await callApi('checkSession');
            if (result && result.status === 'success' && result.user.role === 'admin') {
                document.querySelector('.user-profile .user-name').textContent = result.user.fullname;
                document.querySelector('.user-profile .user-role').textContent = result.user.position || 'ผู้ดูแลระบบ';
                await loadInitialData();
            } else {
                throw new Error('Invalid session or insufficient permissions.');
            }
        } catch (error) {
            console.error('Session check failed:', error.message);
            showCustomAlert('การยืนยันตัวตนล้มเหลว', 'กรุณาเข้าสู่ระบบอีกครั้ง', 'alert', () => {
                window.location.href = 'login.html';
            });
        }
    }

    // --- 3. MODAL & ALERT MANAGEMENT ---

    function openModal(modalElement) {
        modalElement?.classList.add('active-modal');
        document.body.style.overflow = 'hidden';
    }

    function closeModal(modalElement) {
        modalElement?.classList.remove('active-modal');
        if (document.querySelectorAll('.modal.active-modal').length === 0) {
            document.body.style.overflow = '';
        }
        const form = modalElement?.querySelector('form');
        if (form) {
            form.reset();
            const imagePreview = form.querySelector('#deviceImagePreview');
            if (imagePreview) {
                imagePreview.src = '#';
                imagePreview.style.display = 'none';
            }
        }
    }

    function showCustomAlert(title, message, type, confirmCallback = null, cancelCallback = null) {
        const customAlertConfirmTitle = document.getElementById('customAlertConfirmTitle');
        const customAlertConfirmMessage = document.getElementById('customAlertConfirmMessage');
        const customAlertConfirmFooter = document.getElementById('customAlertConfirmFooter');

        customAlertConfirmTitle.textContent = title;
        customAlertConfirmMessage.textContent = message;
        customAlertConfirmFooter.innerHTML = '';

        if (type === 'confirm') {
            const confirmButton = document.createElement('button');
            confirmButton.textContent = 'ยืนยัน';
            confirmButton.className = 'submit-button';
            confirmButton.onclick = () => { closeModal(customAlertConfirmModal); if (confirmCallback) confirmCallback(); };
            
            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'ยกเลิก';
            cancelButton.className = 'cancel-button';
            cancelButton.onclick = () => { closeModal(customAlertConfirmModal); if (cancelCallback) cancelCallback(); };
            
            customAlertConfirmFooter.appendChild(cancelButton);
            customAlertConfirmFooter.appendChild(confirmButton);
        } else {
            const okButton = document.createElement('button');
            okButton.textContent = 'ตกลง';
            okButton.className = 'submit-button';
            okButton.onclick = () => { closeModal(customAlertConfirmModal); if (confirmCallback) confirmCallback(); };
            customAlertConfirmFooter.appendChild(okButton);
        }
        openModal(customAlertConfirmModal);
    }

    function openImageLightbox(src, caption) {
        if (src && imageLightboxModal) {
            lightboxImage.src = src;
            lightboxCaption.textContent = caption;
            openModal(imageLightboxModal);
        }
    }

    // --- 4. RENDERING & FILTERING FUNCTIONS ---

    function renderAllTables() {
        const searchQuery = globalSearchInput.value.toLowerCase();
        renderFilteredTable('repairRequestsTableBody', searchQuery);
        renderFilteredTable('borrowRequestsTableBody', searchQuery);
        renderFilteredTable('generalRequestsTableBody', searchQuery);
        renderDashboardTable('latestRepairTableBody', 'latestRepairPagination', paginationState.latestRepair, searchQuery);
        renderDashboardTable('latestBorrowTableBody', 'latestBorrowPagination', paginationState.latestBorrow, searchQuery);
        renderDashboardTable('latestWithdrawTableBody', 'latestWithdrawPagination', paginationState.latestWithdraw, searchQuery);
    }

    function renderFilteredTable(tableBodyId, searchQuery) {
        const tableBody = document.getElementById(tableBodyId);
        if (!tableBody || !tableBody.closest('.section-container.active')) return;
        const requestType = tableBody.dataset.requestType;
        const filters = getFiltersForType(requestType);
        let filteredRequests = filterRequests(allRequests, requestType, filters, searchQuery);
        if (filteredRequests.length === 0) {
            const colspan = tableBody.previousElementSibling.rows[0].cells.length;
            tableBody.innerHTML = `<tr><td colspan="${colspan}" class="empty-state">ไม่พบข้อมูลที่ตรงตามเงื่อนไข</td></tr>`;
            return;
        }
        tableBody.innerHTML = filteredRequests.map(req => getTableRowHTML(req, 'full_page')).join('');
    }

    function renderDashboardTable(tableBodyId, paginationId, pagination, searchQuery) {
        const tableBody = document.getElementById(tableBodyId);
        if (!tableBody) return;
        const requestType = tableBody.dataset.requestType;
        let entries = filterRequests(allRequests, requestType, {}, searchQuery);
        if (entries.length === 0) {
            const colspan = tableBody.previousElementSibling.rows[0].cells.length;
            tableBody.innerHTML = `<tr><td colspan="${colspan}" class="empty-state">ยังไม่มีข้อมูล</td></tr>`;
            document.getElementById(paginationId).innerHTML = '';
            return;
        }
        const totalPages = Math.ceil(entries.length / pagination.itemsPerPage);
        if (pagination.currentPage > totalPages && totalPages > 0) pagination.currentPage = totalPages;
        const startIndex = (pagination.currentPage - 1) * pagination.itemsPerPage;
        const paginatedItems = entries.slice(startIndex, startIndex + pagination.itemsPerPage);
        tableBody.innerHTML = paginatedItems.map(req => getTableRowHTML(req, 'dashboard')).join('');
        renderPagination(paginationId, totalPages, pagination.currentPage, (page) => {
            pagination.currentPage = page;
            renderDashboardTable(tableBodyId, paginationId, pagination, searchQuery);
        });
    }

    function filterRequests(requests, requestType, filters, searchQuery) {
        return requests
            .filter(req => {
                if (requestType && req.request_type !== requestType) return false;
                if (filters.status && req.status !== filters.status) return false;
                if (filters.assignee && req.assignee !== filters.assignee) return false;
                if (filters.category && req.category_id != filters.category) return false;
                if (searchQuery) {
                    const category = repairCategories.find(c => c.id == req.category_id);
                    const categoryName = req.category_id ? (category ? category.name : '') : (req.other_category_details || '');
                    const searchableText = [
                        req.display_id,
                        req.requester_name,
                        req.subject,
                        req.device_list,
                        categoryName
                    ].join(' ').toLowerCase();
                    if (!searchableText.includes(searchQuery)) return false;
                }
                return true;
            })
            .sort((a, b) => b.id - a.id);
    }

    function getFiltersForType(requestType) {
        switch (requestType) {
            case 'แจ้งซ่อม': return { status: document.getElementById('repairStatusFilter').value, assignee: document.getElementById('repairAssigneeFilter').value, category: document.getElementById('repairCategoryFilter').value };
            case 'ยืม-คืนอุปกรณ์': return { status: document.getElementById('borrowStatusFilter').value, assignee: document.getElementById('borrowAssigneeFilter').value };
            case 'เบิกอุปกรณ์': return { status: document.getElementById('generalStatusFilter').value, assignee: document.getElementById('generalAssigneeFilter').value };
            default: return {};
        }
    }

    function getTableRowHTML(req, context = 'full_page') {
        const category = repairCategories.find(c => c.id == req.category_id);
        const categoryName = req.category_id ? (category ? category.name : 'N/A') : (req.other_category_details || 'N/A');
        
        const actionsCell = `<td data-label="การดำเนินการ" class="actions">${generateActionButtons(req)}</td>`;
        const statusCell = `<td data-label="สถานะ"><span class="status-badge ${getStatusClass(req.status)}">${req.status}</span></td>`;
        const assigneeCell = `<td data-label="ผู้รับผิดชอบ">${req.assignee || '-'}</td>`;
    
        switch (req.request_type) {
            case 'แจ้งซ่อม':
                if (context === 'dashboard') {
                    return `<tr>
                                <td data-label="เลขที่">${req.display_id}</td>
                                <td data-label="ผู้แจ้ง">${req.requester_name}</td>
                                <td data-label="หัวข้อ">${req.subject}</td>
                                ${statusCell}
                                ${assigneeCell}
                                <td data-label="วันที่แจ้ง">${formatDate(req.created_at)}</td>
                                ${actionsCell}
                            </tr>`;
                } else {
                    return `<tr>
                                <td data-label="เลขที่">${req.display_id}</td>
                                <td data-label="ผู้แจ้ง">${req.requester_name}</td>
                                <td data-label="หมวดหมู่">${categoryName}</td>
                                <td data-label="อาการ">${req.subject}</td>
                                ${statusCell}
                                ${assigneeCell}
                                <td data-label="วันที่แจ้ง">${formatDate(req.created_at)}</td>
                                ${actionsCell}
                            </tr>`;
                }
            case 'ยืม-คืนอุปกรณ์':
                return `<tr>
                            <td data-label="เลขที่">${req.display_id}</td>
                            <td data-label="ผู้ยืม">${req.requester_name}</td>
                            <td data-label="อุปกรณ์">${req.device_list || 'N/A'}</td>
                            ${statusCell}
                            ${assigneeCell}
                            <td data-label="วันที่ยืม">${req.borrow_date || formatDate(req.created_at)}</td>
                            <td data-label="กำหนดคืน">${req.expected_return_date}</td>
                            ${actionsCell}
                        </tr>`;
            case 'เบิกอุปกรณ์':
                return `<tr>
                            <td data-label="เลขที่">${req.display_id}</td>
                            <td data-label="ผู้เบิก">${req.requester_name}</td>
                            <td data-label="อุปกรณ์">${req.device_list || 'N/A'}</td>
                            ${statusCell}
                            ${assigneeCell}
                            <td data-label="วันที่เบิก">${req.request_date || formatDate(req.created_at)}</td>
                            ${actionsCell}
                        </tr>`;
            default:
                return '';
        }
    }

    function renderPagination(containerId, totalPages, currentPage, onPageClick) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        if (totalPages <= 1) return;
        const createButton = (text, page, isDisabled = false, isActive = false) => {
            const button = document.createElement('button');
            button.innerHTML = text;
            button.className = 'pagination-button';
            if (isActive) button.classList.add('active');
            button.disabled = isDisabled;
            button.addEventListener('click', () => onPageClick(page));
            return button;
        };
        container.appendChild(createButton('&laquo;', currentPage - 1, currentPage === 1));
        for (let i = 1; i <= totalPages; i++) {
            container.appendChild(createButton(i, i, false, i === currentPage));
        }
        container.appendChild(createButton('&raquo;', currentPage + 1, currentPage === totalPages));
    }

    function updateDashboardStats() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const newTodayCount = allRequests.filter(r => {
            if (!r.created_at) return false;
            const reqDate = new Date(r.created_at);
            reqDate.setHours(0, 0, 0, 0);
            return reqDate.getTime() === today.getTime();
        }).length;
        document.getElementById('newTasksTodayCount').textContent = newTodayCount;

        document.getElementById('pendingRequestsCount').textContent = allRequests.filter(r => ['รอดำเนินการ', 'รออนุมัติ'].includes(r.status)).length;
        document.getElementById('inProgressCount').textContent = allRequests.filter(r => ['อยู่ระหว่างดำเนินการ', 'อนุมัติแล้ว'].includes(r.status)).length;
        document.getElementById('externalRepairCount').textContent = allRequests.filter(r => r.status === 'ส่งซ่อมภายนอก').length;
        document.getElementById('lowStockCount').textContent = allDevices.filter(d => d.available_quantity <= 5).length;
        document.getElementById('completedCount').textContent = allRequests.filter(r => ['เสร็จสิ้น', 'คืนแล้ว'].includes(r.status)).length;
    }

    // --- 5. EVENT HANDLERS & FORM SUBMISSION ---

    async function handleAcceptRequest(id) {
        const req = allRequests.find(r => r.id == id);
        if (!req || !['รอดำเนินการ', 'รออนุมัติ'].includes(req.status)) return showCustomAlert('แจ้งเตือน', 'ไม่สามารถดำเนินการได้ เนื่องจากสถานะไม่ใช่ "รอดำเนินการ" หรือ "รออนุมัติ"', 'alert');
        const isRepair = req.request_type === 'แจ้งซ่อม';
        const confirmTitle = isRepair ? 'ยืนยันการรับงาน' : 'ยืนยันการอนุมัติ';
        const confirmMessage = isRepair ? `คุณต้องการรับงานแจ้งซ่อม #${req.display_id} ใช่หรือไม่?` : `คุณต้องการอนุมัติคำขอ #${req.display_id} ใช่หรือไม่?`;
        showCustomAlert(confirmTitle, confirmMessage, 'confirm', async () => {
            const newStatus = isRepair ? 'อยู่ระหว่างดำเนินการ' : 'อนุมัติแล้ว';
            try {
                const result = await callApi('updateRequest', 'POST', { id: id, status: newStatus, assignee: 'Admin', adminNotes: req.admin_notes || '' });
                if (result && result.status === 'success') {
                    const successMessage = isRepair ? `รับงาน #${req.display_id} เรียบร้อยแล้ว` : `อนุมัติคำขอ #${req.display_id} เรียบร้อยแล้ว`;
                    showCustomAlert('สำเร็จ', successMessage, 'alert');
                    await loadInitialData();
                } else {
                    throw new Error(result.message || 'Update failed');
                }
            } catch (error) {
                showCustomAlert('ข้อผิดพลาด', `เกิดข้อผิดพลาด: ${error.message}`, 'alert');
            }
        });
    }

    // ========== START: โค้ดที่แก้ไข ==========
    async function handleViewRequest(id) {
        try {
            const result = await callApi('getRequestWithDetails', 'POST', { id });
            if (!result || result.status !== 'success' || !result.data) {
                throw new Error(result.message || 'Could not fetch request details.');
            }
            
            const req = result.data;
            
            const viewImage = document.getElementById('viewRequestImage');
            const viewPartsSection = document.getElementById('viewPartsReplacedSection');
            const viewPartsList = document.getElementById('viewPartsReplacedList');
            const viewTotalCost = document.getElementById('viewTotalPartCost');
            const viewDeviceListSection = document.getElementById('viewDeviceListSection');
            const viewDeviceListContainer = document.getElementById('viewDeviceListContainer');

            viewImage.style.display = 'none';
            viewPartsSection.style.display = 'none';
            viewDeviceListSection.style.display = 'none';
            viewPartsList.innerHTML = '';
            viewDeviceListContainer.innerHTML = '';

            document.getElementById('viewRequestTitle').textContent = `รายละเอียดคำขอ #${req.display_id}`;
            document.getElementById('viewRequestId').textContent = req.display_id;
            document.getElementById('viewRequestRequester').textContent = req.requester_name;
            document.getElementById('viewRequestContact').textContent = req.requester_contact || '-'; // แสดงเบอร์ติดต่อ
            document.getElementById('viewRequestDate').textContent = req.request_date || req.borrow_date || formatDate(req.created_at);
            document.getElementById('viewRequestType').textContent = req.request_type;
            document.getElementById('viewRequestAssignee').textContent = req.assignee || '-';
            document.getElementById('viewRequestStatus').innerHTML = `<span class="status-badge ${getStatusClass(req.status)}">${req.status}</span>`;
            document.getElementById('viewRequestSubject').textContent = req.subject || req.device_list || '(ไม่มี)';
            document.getElementById('viewRequestDescription').textContent = req.description || req.purpose || '(ไม่มี)';
            document.getElementById('viewAdminNotes').textContent = req.admin_notes || '(ไม่มี)';

            if (req.request_type === 'แจ้งซ่อม') {
                if (req.image_data) {
                    viewImage.src = req.image_data;
                    viewImage.style.display = 'block';
                    viewImage.onclick = () => openImageLightbox(req.image_data, `รูปภาพสำหรับคำขอ #${req.display_id}`);
                }
                if (req.parts_replaced && req.parts_replaced.length > 0) {
                    let totalCost = 0;
                    req.parts_replaced.forEach(part => {
                        const li = document.createElement('li');
                        const cost = parseFloat(part.price) * parseInt(part.quantity);
                        totalCost += cost;
                        li.textContent = `${part.part_name} - จำนวน: ${part.quantity}, ราคา: ${cost.toFixed(2)} บาท`;
                        viewPartsList.appendChild(li);
                    });
                    viewTotalCost.textContent = totalCost.toFixed(2);
                    viewPartsSection.style.display = 'block';
                }
            } else if (req.request_type === 'ยืม-คืนอุปกรณ์' || req.request_type === 'เบิกอุปกรณ์') {
                if (req.devices && req.devices.length > 0) {
                    req.devices.forEach(device => {
                        const imgSrc = device.image_data || 'https://placehold.co/80x80/eee/333?text=No+Img';
                        const deviceCardHTML = `
                            <div class="view-device-card">
                                <img src="${imgSrc}" alt="${device.name}" onclick="openImageLightbox('${imgSrc}', '${device.name}')">
                                <div class="view-device-info">
                                    <div class="name">${device.name}</div>
                                    <div class="quantity">จำนวน: ${device.quantity}</div>
                                </div>
                            </div>
                        `;
                        viewDeviceListContainer.innerHTML += deviceCardHTML;
                    });
                    viewDeviceListSection.style.display = 'block';
                }
            }

            document.getElementById('editFromViewModalBtn').onclick = () => handleEditRequest(id);
            openModal(viewRequestModal);
        } catch (error) {
            showCustomAlert('ข้อผิดพลาด', `ไม่สามารถโหลดข้อมูลคำขอได้: ${error.message}`, 'alert');
        }
    }
    // ========== END: โค้ดที่แก้ไข ==========

    async function handleEditRequest(id) {
        closeModal(viewRequestModal);
        try {
            const result = await callApi('getRequestWithDetails', 'POST', { id });
            if (!result || result.status !== 'success' || !result.data) {
                throw new Error(result.message || 'Could not fetch request details for editing.');
            }
            const req = result.data;
            document.getElementById('editModalTitle').textContent = `แก้ไขคำขอ #${req.display_id}`;
            document.getElementById('editRequestId').value = req.id;
            document.getElementById('editRequestRequester').value = req.requester_name;
            document.getElementById('editRequestDate').value = req.request_date || req.borrow_date || formatDate(req.created_at);
            document.getElementById('editRequestSubject').value = req.subject || req.device_list || '(ไม่มี)';
            document.getElementById('editRequestDescription').value = req.description || req.purpose || '';
            document.getElementById('editRequestAssignee').value = req.assignee || 'ยังไม่ได้มอบหมาย';
            document.getElementById('adminNotes').value = req.admin_notes || '';
            document.getElementById('editRequestTypeSelect').value = req.request_type;
            const statusSelect = document.getElementById('editRequestStatus');
            statusSelect.innerHTML = '';
            let statusOptions = [];
            const partsSection = document.getElementById('partsReplacementSection');
            if (req.request_type === 'แจ้งซ่อม') {
                statusOptions = ['รอดำเนินการ', 'อยู่ระหว่างดำเนินการ', 'ส่งซ่อมภายนอก', 'เสร็จสิ้น'];
                partsSection.style.display = 'block';
                currentParts = req.parts_replaced || [];
                renderPartsList();
            } else {
                partsSection.style.display = 'none';
                currentParts = []; 
                if (req.request_type === 'ยืม-คืนอุปกรณ์') statusOptions = ['รออนุมัติ', 'อนุมัติแล้ว', 'ไม่อนุมัติ', 'คืนแล้ว', 'ยกเลิก'];
                else if (req.request_type === 'เบิกอุปกรณ์') statusOptions = ['รออนุมัติ', 'อนุมัติแล้ว', 'ไม่อนุมัติ', 'เสร็จสิ้น', 'ยกเลิก'];
            }
            statusOptions.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt;
                option.textContent = opt;
                statusSelect.appendChild(option);
            });
            statusSelect.value = req.status;
            document.getElementById('deleteRequestBtn').onclick = () => handleDeleteRequest(id, req.display_id);
            openModal(editRequestModal);
        } catch (error) {
             showCustomAlert('ข้อผิดพลาด', `ไม่สามารถโหลดข้อมูลสำหรับแก้ไขได้: ${error.message}`, 'alert');
        }
    }

    async function handleEditRequestFormSubmit(event) {
        event.preventDefault();
        const updateData = {
            id: document.getElementById('editRequestId').value,
            status: document.getElementById('editRequestStatus').value,
            assignee: document.getElementById('editRequestAssignee').value,
            adminNotes: document.getElementById('adminNotes').value,
            parts_replaced: currentParts
        };
        try {
            const result = await callApi('updateRequest', 'POST', updateData);
            if (result && result.status === 'success') {
                closeModal(editRequestModal);
                showCustomAlert('สำเร็จ', 'บันทึกการเปลี่ยนแปลงเรียบร้อยแล้ว', 'alert');
                await loadInitialData();
            } else {
                 throw new Error(result.message || 'Update failed');
            }
        } catch (error) {
            showCustomAlert('ข้อผิดพลาด', `เกิดข้อผิดพลาดในการบันทึก: ${error.message}`, 'alert');
        }
    }

    function handleDeleteRequest(id, displayId) {
        showCustomAlert('ยืนยันการลบ', `คุณแน่ใจหรือไม่ว่าต้องการลบคำขอ #${displayId}? การกระทำนี้ไม่สามารถย้อนกลับได้`, 'confirm', async () => {
            try {
                const result = await callApi('deleteRequest', 'POST', { id: id });
                if (result && result.status === 'success') {
                    closeModal(editRequestModal);
                    closeModal(viewRequestModal);
                    showCustomAlert('สำเร็จ', `ลบคำขอ #${displayId} เรียบร้อยแล้ว`, 'alert');
                    await loadInitialData();
                } else {
                    throw new Error(result.message || 'Delete failed');
                }
            } catch (error) {
                showCustomAlert('ข้อผิดพลาด', `เกิดข้อผิดพลาดในการลบ: ${error.message}`, 'alert');
            }
        });
    }

    // --- 6. CATEGORY, DEVICE, & USER MANAGEMENT ---

    function populateAllFilters() {
        const repairCategoryFilter = document.getElementById('repairCategoryFilter');
        repairCategoryFilter.innerHTML = '<option value="">หมวดหมู่ทั้งหมด</option>';
        repairCategories.forEach(cat => { repairCategoryFilter.innerHTML += `<option value="${cat.id}">${cat.name}</option>`; });
        
        const assigneeFilters = document.querySelectorAll('#repairAssigneeFilter, #borrowAssigneeFilter, #generalAssigneeFilter, #editRequestAssignee');
        assigneeFilters.forEach(filter => {
            const currentValue = filter.value;
            filter.innerHTML = `<option value="ยังไม่ได้มอบหมาย">ยังไม่ได้มอบหมาย</option>`;
            currentAssignees.forEach(name => { filter.innerHTML += `<option value="${name}">${name}</option>`; });
            if (Array.from(filter.options).some(opt => opt.value === currentValue)) filter.value = currentValue;
            else if (filter.id !== 'editRequestAssignee') filter.value = ''; // Reset if not in edit modal
        });

        const statuses = [...new Set(allRequests.map(r => r.status))];
        historyStatusFilter.innerHTML = '<option value="">ทุกสถานะ</option>';
        statuses.forEach(status => {
            historyStatusFilter.innerHTML += `<option value="${status}">${status}</option>`;
        });
    }

    function renderCategoryTable() {
        if (!categoryTableBody) return;
        if (repairCategories.length === 0) {
            categoryTableBody.innerHTML = `<tr><td colspan="3" class="empty-state">ยังไม่มีหมวดหมู่</td></tr>`;
            return;
        }
        const sortedCategories = [...repairCategories].sort((a, b) => a.id - b.id);
        
        categoryTableBody.innerHTML = sortedCategories.map((cat, index) => `
            <tr>
                <td>CAT-${index + 1}</td>
                <td>${cat.name}</td>
                <td class="actions">
                    <button class="action-button edit-btn" title="แก้ไข" onclick="openCategoryModal('edit', '${cat.id}')"><i class="fa-solid fa-pencil"></i></button>
                    <button class="action-button delete-btn" title="ลบ" onclick="deleteCategory('${cat.id}', '${cat.name}')"><i class="fa-solid fa-trash-alt"></i></button>
                </td>
            </tr>`).join('');
    }

    function openCategoryModal(mode = 'new', id = null) {
        categoryForm.reset();
        document.getElementById('categoryId').value = id || '';
        if (mode === 'edit') {
            const category = repairCategories.find(c => c.id == id);
            document.getElementById('categoryModalTitle').textContent = 'แก้ไขหมวดหมู่';
            document.getElementById('categoryName').value = category.name;
        } else {
            document.getElementById('categoryModalTitle').textContent = 'เพิ่มหมวดหมู่ใหม่';
        }
        openModal(categoryModal);
    }

    async function handleCategoryFormSubmit(event) {
        event.preventDefault();
        const id = document.getElementById('categoryId').value;
        const name = document.getElementById('categoryName').value.trim();
        if (!name) return showCustomAlert('ข้อผิดพลาด', 'กรุณากรอกชื่อหมวดหมู่', 'alert');
        try {
            const result = await callApi('createOrUpdateCategory', 'POST', { id: id, name: name });
            if (result && result.status === 'success') {
                closeModal(categoryModal);
                showCustomAlert('สำเร็จ', 'บันทึกหมวดหมู่เรียบร้อยแล้ว', 'alert');
                await loadInitialData();
            } else {
                throw new Error(result.message || 'Save failed');
            }
        } catch (error) {
            showCustomAlert('ข้อผิดพลาด', `เกิดข้อผิดพลาด: ${error.message}`, 'alert');
        }
    }

    async function deleteCategory(id, name) {
        showCustomAlert('ยืนยันการลบ', `คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่ "${name}"?`, 'confirm', async () => {
            try {
                const result = await callApi('deleteCategory', 'POST', { id: id });
                if (result && result.status === 'success') {
                    showCustomAlert('สำเร็จ', 'ลบหมวดหมู่เรียบร้อยแล้ว', 'alert');
                    await loadInitialData();
                } else {
                    throw new Error(result.message || 'Delete failed');
                }
            } catch (error) {
                showCustomAlert('ข้อผิดพลาด', `เกิดข้อผิดพลาด: ${error.message}`, 'alert');
            }
        });
    }

    function renderDeviceCards() {
        if (!borrowDeviceCardContainer || !withdrawDeviceCardContainer) return;
        borrowDeviceCardContainer.innerHTML = '';
        withdrawDeviceCardContainer.innerHTML = '';
        const borrowDevices = allDevices.filter(dev => dev.device_type === 'borrow');
        const withdrawDevices = allDevices.filter(dev => dev.device_type === 'withdraw');
        const createDeviceCardHTML = (dev) => `
            <div class="device-card">
                <div class="device-card-header ${dev.device_type === 'borrow' ? 'borrow-header' : 'withdraw-header'}">
                    <span>${dev.display_id}</span>
                    <span>คงเหลือ: ${dev.available_quantity}</span>
                </div>
                <div class="device-card-body">
                    <img src="${dev.image_data || 'https://placehold.co/60x60/eee/333?text=No+Img'}" alt="${dev.name}" class="device-card-img" onerror="this.onerror=null;this.src='https://placehold.co/60x60/eee/333?text=Error';">
                    <div class="device-card-info">
                        <div class="name">${dev.name}</div>
                        <div class="brand">${dev.brand || '-'}</div>
                    </div>
                </div>
                <div class="device-card-footer">
                    <div class="actions">
                        <button class="action-button edit-btn" title="แก้ไข" onclick="openDeviceModal('edit', '${dev.id}')"><i class="fa-solid fa-pencil"></i></button>
                        <button class="action-button delete-btn" title="ลบ" onclick="deleteDevice('${dev.id}', '${dev.name}')"><i class="fa-solid fa-trash-alt"></i></button>
                    </div>
                </div>
            </div>`;
        borrowDeviceCardContainer.innerHTML = borrowDevices.length > 0 ? borrowDevices.map(createDeviceCardHTML).join('') : `<p class="empty-state">ไม่มีอุปกรณ์สำหรับยืม-คืน</p>`;
        withdrawDeviceCardContainer.innerHTML = withdrawDevices.length > 0 ? withdrawDevices.map(createDeviceCardHTML).join('') : `<p class="empty-state">ไม่มีอุปกรณ์สำหรับเบิก</p>`;
    }

    function openDeviceModal(mode = 'new', id = null) {
        deviceForm.reset();
        document.getElementById('deviceId').value = id || '';
        const imagePreview = document.getElementById('deviceImagePreview');
        imagePreview.src = '#';
        imagePreview.style.display = 'none';
        if (mode === 'edit' && id) {
            const device = allDevices.find(d => d.id == id);
            if (device) {
                deviceModalTitle.textContent = 'แก้ไขอุปกรณ์';
                document.getElementById('deviceName').value = device.name;
                document.getElementById('deviceBrand').value = device.brand;
                document.getElementById('deviceAvailable').value = device.available_quantity;
                document.getElementById('deviceType').value = device.device_type;
                if (device.image_data) {
                    imagePreview.src = device.image_data;
                    imagePreview.style.display = 'block';
                }
            }
        } else {
            deviceModalTitle.textContent = 'เพิ่มอุปกรณ์ใหม่';
        }
        openModal(deviceModal);
    }

    async function handleDeviceFormSubmit(event) {
        event.preventDefault();
        const submitBtn = deviceForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        const imageFile = document.getElementById('deviceImageFile').files[0];
        let imageData = null;
        if (imageFile) {
            try { imageData = await resizeImage(imageFile, 800, 800, 0.8); } 
            catch (error) { showCustomAlert('ข้อผิดพลาด', 'ไม่สามารถประมวลผลรูปภาพได้ กรุณาลองใหม่อีกครั้ง', 'alert'); submitBtn.disabled = false; return; }
        } else {
            const deviceId = document.getElementById('deviceId').value;
            if (deviceId) { const existingDevice = allDevices.find(d => d.id == deviceId); imageData = existingDevice ? existingDevice.image_data : null; }
        }
        const deviceData = {
            id: document.getElementById('deviceId').value, name: document.getElementById('deviceName').value.trim(),
            brand: document.getElementById('deviceBrand').value.trim(), available: parseInt(document.getElementById('deviceAvailable').value),
            imageData: imageData, device_type: document.getElementById('deviceType').value,
        };
        if (!deviceData.name || isNaN(deviceData.available)) { showCustomAlert('ข้อผิดพลาด', 'กรุณากรอกชื่อและจำนวนอุปกรณ์ให้ถูกต้อง', 'alert'); submitBtn.disabled = false; return; }
        
        try {
            const result = await callApi('createOrUpdateDevice', 'POST', deviceData);
            if (result && result.status === 'success') {
                closeModal(deviceModal); 
                showCustomAlert('สำเร็จ', 'บันทึกอุปกรณ์เรียบร้อยแล้ว', 'alert'); 
                await loadInitialData();
            } else {
                throw new Error(result.message || 'Save failed');
            }
        } catch (error) {
            showCustomAlert('ข้อผิดพลาด', `เกิดข้อผิดพลาด: ${error.message}`, 'alert');
        } finally {
            submitBtn.disabled = false;
        }
    }

    async function deleteDevice(id, name) {
        showCustomAlert('ยืนยันการลบ', `คุณแน่ใจหรือไม่ว่าต้องการลบอุปกรณ์ "${name}"?`, 'confirm', async () => {
            try {
                const result = await callApi('deleteDevice', 'POST', { id: id });
                if (result && result.status === 'success') {
                    showCustomAlert('สำเร็จ', 'ลบอุปกรณ์เรียบร้อยแล้ว', 'alert'); 
                    await loadInitialData();
                } else {
                    throw new Error(result.message || 'Delete failed');
                }
            } catch (error) {
                 showCustomAlert('ข้อผิดพลาด', `เกิดข้อผิดพลาด: ${error.message}`, 'alert');
            }
        });
    }

    function renderUserManagementTable() {
        if (!userManagementTableBody || !userManagementTableBody.closest('.section-container.active')) return;

        const searchQuery = globalSearchInput.value.toLowerCase();
        const filteredUsers = allUsers.filter(user => 
            (user.fullname?.toLowerCase() || '').includes(searchQuery) ||
            (user.email?.toLowerCase() || '').includes(searchQuery)
        );

        if (filteredUsers.length === 0) {
            userManagementTableBody.innerHTML = `<tr><td colspan="8" class="empty-state">ไม่พบข้อมูลผู้ใช้งาน</td></tr>`;
            return;
        }

        userManagementTableBody.innerHTML = filteredUsers.map(user => `
            <tr>
                <td data-label="ID">${user.id}</td>
                <td data-label="ชื่อ-นามสกุล">${user.fullname}</td>
                <td data-label="อีเมล">${user.email}</td>
                <td data-label="ฝ่าย">${user.department || '-'}</td>
                <td data-label="ตำแหน่ง">${user.position || '-'}</td>
                <td data-label="สิทธิ์การใช้งาน">
                    <span class="role-badge role-${user.role}">${user.role}</span>
                </td>
                <td data-label="เปลี่ยนสิทธิ์">
                    <select class="role-select" data-user-id="${user.id}" onchange="handleRoleChange(event)">
                        <option value="user" ${user.role === 'user' ? 'selected' : ''}>User</option>
                        <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                </td>
                <td data-label="การดำเนินการ" class="actions">
                    <button class="action-button edit-btn" title="แก้ไขข้อมูลผู้ใช้" onclick="openEditUserModal('${user.id}')">
                        <i class="fa-solid fa-user-pen"></i>
                    </button>
                    <button class="action-button delete-btn" title="ลบผู้ใช้งาน" onclick="deleteUser('${user.id}', '${user.fullname}')">
                        <i class="fa-solid fa-user-slash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    async function handleRoleChange(event) {
        const selectElement = event.target;
        const userId = selectElement.dataset.userId;
        const newRole = selectElement.value;
        const user = allUsers.find(u => u.id == userId);
        
        if (!user) return;

        const originalRole = user.role; 

        const confirmMessage = `คุณแน่ใจหรือไม่ว่าต้องการเปลี่ยนสิทธิ์ของ "${user.fullname}" เป็น "${newRole.toUpperCase()}"?`;

        showCustomAlert('ยืนยันการเปลี่ยนแปลงสิทธิ์', confirmMessage, 'confirm', 
            async () => {
                try {
                    const result = await callApi('updateUserRole', 'POST', { user_id: userId, role: newRole });
                    if (result && result.status === 'success') {
                        showCustomAlert('สำเร็จ', result.message, 'alert');
                        await loadInitialData();
                    } else {
                        throw new Error(result.message || 'Update failed');
                    }
                } catch (error) {
                    showCustomAlert('ข้อผิดพลาด', `เกิดข้อผิดพลาด: ${error.message}`, 'alert');
                    selectElement.value = originalRole;
                }
            },
            () => { 
                selectElement.value = originalRole;
            }
        );
    }

    function openEditUserModal(userId) {
        const user = allUsers.find(u => u.id == userId);
        if (!user) {
            showCustomAlert('ข้อผิดพลาด', 'ไม่พบข้อมูลผู้ใช้', 'alert');
            return;
        }

        editUserForm.reset();
        document.getElementById('editUserId').value = user.id;
        document.getElementById('editUserModalTitle').textContent = `แก้ไขข้อมูล: ${user.fullname}`;
        document.getElementById('editUserFullname').value = user.fullname;
        document.getElementById('editUserEmail').value = user.email;
        document.getElementById('editUserDepartment').value = user.department || '';
        document.getElementById('editUserPosition').value = user.position || '';
        
        openModal(editUserModal);
    }

    async function handleEditUserFormSubmit(event) {
        event.preventDefault();
        const submitBtn = editUserForm.querySelector('button[type="submit"]');
        submitBtn.disabled = true;

        const userData = {
            user_id: document.getElementById('editUserId').value,
            fullname: document.getElementById('editUserFullname').value.trim(),
            department: document.getElementById('editUserDepartment').value.trim(),
            position: document.getElementById('editUserPosition').value.trim(),
        };

        if (!userData.fullname) {
            showCustomAlert('ข้อมูลไม่ถูกต้อง', 'กรุณากรอกชื่อ-นามสกุล', 'alert');
            submitBtn.disabled = false;
            return;
        }

        try {
            const result = await callApi('updateUser', 'POST', userData);
            if (result && result.status === 'success') {
                closeModal(editUserModal);
                showCustomAlert('สำเร็จ', 'อัปเดตข้อมูลผู้ใช้เรียบร้อยแล้ว', 'alert');
                await loadInitialData();
            } else {
                throw new Error(result.message || 'Update failed');
            }
        } catch (error) {
            showCustomAlert('ข้อผิดพลาด', `เกิดข้อผิดพลาด: ${error.message}`, 'alert');
        } finally {
            submitBtn.disabled = false;
        }
    }

    async function deleteUser(userId, fullname) {
        const confirmMessage = `คุณแน่ใจหรือไม่ว่าต้องการลบผู้ใช้งาน "${fullname}"? การกระทำนี้ไม่สามารถย้อนกลับได้`;
        
        showCustomAlert('ยืนยันการลบผู้ใช้งาน', confirmMessage, 'confirm', async () => {
            try {
                const result = await callApi('deleteUser', 'POST', { user_id: userId });
                if (result && result.status === 'success') {
                    showCustomAlert('สำเร็จ', result.message, 'alert');
                    await loadInitialData();
                } else {
                    throw new Error(result.message || 'Delete failed');
                }
            } catch (error) {
                showCustomAlert('ข้อผิดพลาด', `เกิดข้อผิดพลาดในการลบ: ${error.message}`, 'alert');
            }
        });
    }


    // --- 7. PART REPLACEMENT & HISTORY REPORT FUNCTIONS ---

    function renderPartsList() {
        if (!partsListContainer) return;
        partsListContainer.innerHTML = '';
        if (currentParts.length === 0) {
            partsListContainer.innerHTML = `<p class="empty-parts-list">ยังไม่มีรายการอะไหล่</p>`;
            return;
        }
        currentParts.forEach((part, index) => {
            const partItem = document.createElement('div');
            partItem.className = 'part-list-item';
            partItem.innerHTML = `
                <span class="part-name">${part.part_name}</span>
                <span class="part-quantity">จำนวน: ${part.quantity}</span>
                <span class="part-price">ราคา: ${(part.price * part.quantity).toFixed(2)}</span>
                <div class="part-actions">
                    <button type="button" class="action-button edit-btn" title="แก้ไขรายการอะไหล่"><i class="fa-solid fa-pencil"></i></button>
                    <button type="button" class="action-button delete-btn" title="ลบรายการอะไหล่"><i class="fa-solid fa-trash-alt"></i></button>
                </div>
            `;
            partItem.querySelector('.edit-btn').addEventListener('click', () => openPartModal(index));
            partItem.querySelector('.delete-btn').addEventListener('click', () => deletePart(index));
            partsListContainer.appendChild(partItem);
        });
    }

    function openPartModal(index = -1) {
        partForm.reset();
        document.getElementById('partIndex').value = index;
        if (index > -1) {
            const part = currentParts[index];
            document.getElementById('partModalTitle').textContent = 'แก้ไขรายการอะไหล่';
            document.getElementById('partName').value = part.part_name;
            document.getElementById('partQuantity').value = part.quantity;
            document.getElementById('partPrice').value = part.price;
        } else {
            document.getElementById('partModalTitle').textContent = 'เพิ่มรายการอะไหล่';
        }
        openModal(partModal);
    }

    function handlePartFormSubmit(event) {
        event.preventDefault();
        const index = parseInt(document.getElementById('partIndex').value);
        const partData = {
            part_name: document.getElementById('partName').value.trim(),
            quantity: parseInt(document.getElementById('partQuantity').value),
            price: parseFloat(document.getElementById('partPrice').value)
        };
        if (!partData.part_name || isNaN(partData.quantity) || partData.quantity < 1 || isNaN(partData.price) || partData.price < 0) {
            showCustomAlert('ข้อมูลไม่ถูกต้อง', 'กรุณากรอกข้อมูลอะไหล่ให้ครบถ้วนและถูกต้อง', 'alert');
            return;
        }
        if (index > -1) {
            currentParts[index] = partData;
        } else {
            currentParts.push(partData);
        }
        renderPartsList();
        closeModal(partModal);
    }
    
    function deletePart(index) {
        currentParts.splice(index, 1);
        renderPartsList();
    }

    function renderHistoryTable() {
        if (!historyTableBody || !historyTableBody.closest('.section-container.active')) return;
        const type = historyTypeFilter.value;
        const status = historyStatusFilter.value;
        const dateRange = historyDateFilter.value;
        let [startDate, endDate] = [null, null];

        if (dateRange) {
            const dates = dateRange.split(' to ');
            startDate = dates[0] ? new Date(dates[0].split('/').reverse().join('-')) : null;
            if(startDate) startDate.setHours(0, 0, 0, 0);
            endDate = dates[1] ? new Date(dates[1].split('/').reverse().join('-')) : null;
            if(endDate) endDate.setHours(23, 59, 59, 999);
        }

        const filtered = allRequests.filter(req => {
            if (type && req.request_type !== type) return false;
            if (status && req.status !== status) return false;
            if (startDate && endDate) {
                const reqDate = new Date(req.created_at);
                if (reqDate < startDate || reqDate > endDate) return false;
            }
            return true;
        });

        if (filtered.length === 0) {
            const colspan = historyTableBody.previousElementSibling.rows[0].cells.length;
            historyTableBody.innerHTML = `<tr><td colspan="${colspan}" class="empty-state">ไม่พบข้อมูลที่ตรงตามเงื่อนไข</td></tr>`;
            return;
        }

        historyTableBody.innerHTML = filtered.map(req => {
            let details = '-';
            if (req.request_type === 'แจ้งซ่อม' && req.parts_replaced && req.parts_replaced.length > 0) {
                details = `เปลี่ยนอะไหล่ ${req.parts_replaced.length} รายการ`;
            } else if (req.request_type === 'ยืม-คืนอุปกรณ์') {
                details = `กำหนดคืน: ${req.expected_return_date || '-'}`;
            }
            return `
                <tr>
                    <td data-label="เลขที่">${req.display_id}</td>
                    <td data-label="ประเภท">${req.request_type}</td>
                    <td data-label="หัวข้อ/อุปกรณ์">${req.subject || req.device_list || '-'}</td>
                    <td data-label="ผู้แจ้ง">${req.requester_name}</td>
                    <td data-label="สถานะ"><span class="status-badge ${getStatusClass(req.status)}">${req.status}</span></td>
                    <td data-label="วันที่">${formatDate(req.created_at)}</td>
                    <td data-label="รายละเอียดเพิ่มเติม">${details}</td>
                </tr>
            `;
        }).join('');
    }

    function handlePrintHistoryReport() {
        showCustomAlert('กำลังพัฒนา', 'ฟังก์ชันพิมพ์รายงานสรุปกำลังอยู่ในระหว่างการพัฒนา', 'alert');
    }

    // --- 8. UTILITY & OTHER FUNCTIONS ---

    function generateActionButtons(req) {
        let buttons = '';
        if (req.status === 'รอดำเนินการ' || req.status === 'รออนุมัติ') {
            const title = req.request_type === 'แจ้งซ่อม' ? 'รับงาน' : 'อนุมัติ';
            const icon = req.request_type === 'แจ้งซ่อม' ? 'fa-hand-paper' : 'fa-check';
            buttons += `<button class="action-button accept-btn" title="${title}" onclick="handleAcceptRequest('${req.id}')"><i class="fa-solid ${icon}"></i></button>`;
        }
        buttons += `<button class="action-button view-btn" title="ดูรายละเอียด" onclick="handleViewRequest('${req.id}')"><i class="fa-solid fa-eye"></i></button>`;
        buttons += `<button class="action-button edit-btn" title="แก้ไข" onclick="handleEditRequest('${req.id}')"><i class="fa-solid fa-pencil"></i></button>`;
        if (req.request_type === 'แจ้งซ่อม' && req.status === 'เสร็จสิ้น') {
            buttons += `<button class="action-button print-btn" title="พิมพ์รายงาน" onclick="handlePrintRequest('${req.id}')"><i class="fa-solid fa-print"></i></button>`;
        }
        buttons += `<button class="action-button delete-btn" title="ลบ" onclick="handleDeleteRequest('${req.id}', '${req.display_id}')"><i class="fa-solid fa-trash-alt"></i></button>`;
        return buttons;
    }

    async function handlePrintRequest(id) {
        try {
            const result = await callApi('getRequestWithDetails', 'POST', { id });
            if (!result || result.status !== 'success' || !result.data) {
                throw new Error(result.message || 'Could not fetch data for printing.');
            }
            const req = result.data;
            const category = repairCategories.find(c => c.id == req.category_id);
            const categoryName = req.category_id ? (category ? category.name : 'N/A') : (req.other_category_details || 'N/A');
            let partsHtml = '<tr><td colspan="5" style="text-align:center;">ไม่มีการเปลี่ยนอะไหล่</td></tr>';
            let totalCost = 0;
            if (req.parts_replaced && req.parts_replaced.length > 0) {
                const partsRows = req.parts_replaced.map((part, index) => {
                    const cost = parseFloat(part.price) * parseInt(part.quantity);
                    totalCost += cost;
                    return `<tr><td>${index + 1}</td><td>${part.part_name}</td><td>${part.quantity}</td><td>${parseFloat(part.price).toFixed(2)}</td><td>${cost.toFixed(2)}</td></tr>`;
                }).join('');
                partsHtml = `${partsRows}<tr class="total-row"><td colspan="4" style="text-align:right;"><strong>ราคารวมทั้งหมด</strong></td><td><strong>${totalCost.toFixed(2)}</strong></td></tr>`;
            }
            
            const printContent = `
                <div class="print-container">
                    <header class="print-header">
                        <img src="โลโก้ หอภาพยนต์.png" alt="Logo" class="print-logo">
                        <div class="print-title-section">
                            <h2>ใบรายงานผลการซ่อม</h2>
                            <h3>หอภาพยนตร์ (องค์การมหาชน)</h3>
                        </div>
                    </header>

                    <main class="print-body">
                        <section class="print-section">
                            <div class="section-title">ข้อมูลการแจ้งซ่อม</div>
                            <div class="info-grid">
                                <div><strong>เลขที่เอกสาร:</strong> ${req.display_id}</div>
                                <div><strong>วันที่แจ้ง:</strong> ${formatDate(req.created_at)}</div>
                                <div><strong>ผู้แจ้ง:</strong> ${req.requester_name}</div>
                                <div><strong>แผนก:</strong> ${req.requester_department || '-'}</div>
                                <div><strong>สถานที่/ห้อง:</strong> ${req.location || '-'}</div>
                                <div><strong>หมวดหมู่:</strong> ${categoryName}</div>
                            </div>
                        </section>

                        <section class="print-section">
                            <div class="section-title">รายละเอียดปัญหาและวิธีแก้ไข</div>
                            <div class="details-box">
                                <p><strong>ปัญหาที่แจ้ง:</strong> ${req.subject || '-'}</p>
                                <p><strong>รายละเอียดเพิ่มเติม:</strong> ${req.description || '-'}</p>
                            </div>
                            <div class="details-box">
                                <p><strong>การดำเนินการ / วิธีแก้ไข:</strong> ${req.admin_notes || '-'}</p>
                            </div>
                        </section>

                        <section class="print-section">
                            <div class="section-title">รายการอะไหล่ที่ใช้ (ถ้ามี)</div>
                            <table class="parts-table">
                                <thead>
                                    <tr>
                                        <th style="width: 10%;">ลำดับ</th>
                                        <th style="width: 40%;">ชื่ออะไหล่</th>
                                        <th style="width: 15%;">จำนวน</th>
                                        <th style="width: 17.5%;">ราคา/หน่วย (บาท)</th>
                                        <th style="width: 17.5%;">ราคารวม (บาท)</th>
                                    </tr>
                                </thead>
                                <tbody>${partsHtml}</tbody>
                            </table>
                        </section>
                    </main>

                    <footer class="print-footer">
                        <div class="signature-box">
                            <div class="signature-line"></div>
                            <p>( ${req.requester_name} )</p>
                            <p><strong>ผู้แจ้ง</strong></p>
                        </div>
                        <div class="signature-box">
                            <div class="signature-line"></div>
                            <p>( ${req.assignee || '..............................'} )</p>
                            <p><strong>ผู้ดำเนินการซ่อม</strong></p>
                        </div>
                    </footer>
                </div>`;

            const printWindow = window.open('', '', 'height=800,width=800');
            printWindow.document.write(`
                <html>
                    <head>
                        <title>พิมพ์รายงานการซ่อม - ${req.display_id}</title>
                        <link rel="preconnect" href="https://fonts.googleapis.com">
                        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                        <link href="https://fonts.googleapis.com/css2?family=TH+Sarabun+PSK:wght@400;700&display=swap" rel="stylesheet">
                        <link rel="stylesheet" href="adminstyle.css">
                    </head>
                    <body>
            `);
            printWindow.document.write(printContent);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            setTimeout(() => { 
                printWindow.focus();
                printWindow.print();
                printWindow.close();
            }, 500);
        } catch (error) {
            showCustomAlert('ข้อผิดพลาด', `ไม่สามารถโหลดข้อมูลสำหรับพิมพ์ได้: ${error.message}`, 'alert');
        }
    }

    function getStatusClass(status) {
        const statusMap = { 'รอดำเนินการ': 'status-pending', 'รออนุมัติ': 'status-pending', 'อยู่ระหว่างดำเนินการ': 'status-in-progress', 'ส่งซ่อมภายนอก': 'status-external-repair', 'เสร็จสิ้น': 'status-completed', 'ยกเลิก': 'status-cancelled', 'อนุมัติแล้ว': 'status-approved', 'ไม่อนุมัติ': 'status-rejected', 'คืนแล้ว': 'status-returned' };
        return statusMap[status] || 'status-pending';
    }

    function formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear() + 543;
        return `${day}/${month}/${year}`;
    }

    function resizeImage(file, maxWidth, maxHeight, quality) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width, height = img.height;
                    if (width > height) { if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; } } 
                    else { if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; } }
                    canvas.width = width; canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                };
                img.onerror = reject; img.src = event.target.result;
            };
            reader.onerror = reject; reader.readAsDataURL(file);
        });
    }

    // --- 9. INITIALIZATION & EVENT LISTENERS ---

    function initializeEventListeners() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        htmlElement.dataset.theme = savedTheme;
        themeToggles.forEach(toggle => {
            const icon = toggle.querySelector('i');
            if(icon) icon.className = savedTheme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun';
            toggle.addEventListener('click', () => {
                const newTheme = htmlElement.dataset.theme === 'light' ? 'dark' : 'light';
                htmlElement.dataset.theme = newTheme;
                localStorage.setItem('theme', newTheme);
                themeToggles.forEach(t => { const i = t.querySelector('i'); if(i) i.className = newTheme === 'dark' ? 'fa-solid fa-moon' : 'fa-solid fa-sun'; });
            });
        });

        menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
        document.querySelectorAll('.sidebar .menu-item').forEach(item => {
            item.addEventListener('click', (e) => { e.preventDefault(); showSection(item.dataset.section); });
        });

        allModals.forEach(modal => {
            modal.querySelector('.close-button')?.addEventListener('click', () => closeModal(modal));
            modal.querySelector('.cancel-button')?.addEventListener('click', () => closeModal(modal));
        });
        window.addEventListener('click', (event) => { if (event.target.classList.contains('modal')) closeModal(event.target); });
        imageLightboxModal.querySelector('.close-lightbox-button')?.addEventListener('click', () => closeModal(imageLightboxModal));

        allFilters.forEach(filter => filter.addEventListener('change', renderAllTables));
        globalSearchInput.addEventListener('input', () => {
            renderAllTables();
            renderUserManagementTable();
        });

        historyTypeFilter.addEventListener('change', renderHistoryTable);
        historyStatusFilter.addEventListener('change', renderHistoryTable);
        flatpickr(historyDateFilter, {
            mode: "range",
            dateFormat: "d/m/Y",
            onChange: function(selectedDates, dateStr, instance) {
                renderHistoryTable();
            }
        });
        printHistoryBtn.addEventListener('click', handlePrintHistoryReport);

        editRequestForm.addEventListener('submit', handleEditRequestFormSubmit);
        categoryForm.addEventListener('submit', handleCategoryFormSubmit);
        deviceForm.addEventListener('submit', handleDeviceFormSubmit);
        partForm.addEventListener('submit', handlePartFormSubmit);
        editUserForm.addEventListener('submit', handleEditUserFormSubmit);

        document.getElementById('addNewCategoryBtn').addEventListener('click', () => openCategoryModal('new'));
        document.getElementById('addNewDeviceBtn').addEventListener('click', () => openDeviceModal('new'));
        document.getElementById('addPartBtn').addEventListener('click', () => openPartModal());

        document.getElementById('deviceImageFile').addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const preview = document.getElementById('deviceImagePreview');
                preview.src = URL.createObjectURL(this.files[0]);
                preview.style.display = 'block';
            }
        });
    }
    
    // --- App Entry Point ---
    initializeEventListeners();
    showSection('dashboardSection');
    checkUserSession();
    
    // Expose functions to global scope for inline event handlers
    window.handleAcceptRequest = handleAcceptRequest;
    window.handleViewRequest = handleViewRequest;
    window.handleEditRequest = handleEditRequest;
    window.handleDeleteRequest = handleDeleteRequest;
    window.handlePrintRequest = handlePrintRequest;
    window.openCategoryModal = openCategoryModal;
    window.deleteCategory = deleteCategory;
    window.openDeviceModal = openDeviceModal;
    window.deleteDevice = deleteDevice;
    window.openImageLightbox = openImageLightbox;
    window.handleRoleChange = handleRoleChange;
    window.openEditUserModal = openEditUserModal;
    window.deleteUser = deleteUser;
});
