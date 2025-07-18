<?php
// ############################################################################
// #        IT HELPDESK SYSTEM - API (With Simplified Forgot Password)        #
// ############################################################################

session_start();

// --- 1. การตั้งค่าการเชื่อมต่อฐานข้อมูล ---
$db_host = 'localhost';
$db_user = 'root';
$db_pass = '';
$db_name = 'it_helpdesk_db';

header('Content-Type: application/json; charset=utf-8');
date_default_timezone_set('Asia/Bangkok');

// --- 2. สร้างการเชื่อมต่อกับฐานข้อมูล ---
try {
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8mb4", $db_user, $db_pass);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed: ' . $e->getMessage()]);
    exit();
}

// --- 3. ตัวจัดการคำขอ (Request Router) ---
$action = $_GET['action'] ?? '';
$input = json_decode(file_get_contents('php://input'), true);

try {
    // รายการ actions ที่ต้องมีการยืนยันตัวตน (login) ก่อน
    $auth_required_actions = [
        'getAllData', 'getRequestWithDetails', 'createRequest', 'updateRequest', 
        'updateUserRequest', 'deleteRequest', 'createOrUpdateCategory', 'deleteCategory',
        'createOrUpdateDevice', 'deleteDevice', 'updateUserRole', 'updateUser', 'deleteUser'
    ];

    if (in_array($action, $auth_required_actions)) {
        if (!isset($_SESSION['user_id'])) {
            throw new Exception("Authentication required. Please log in.");
        }
        // ตรวจสอบสิทธิ์ Admin สำหรับ actions ที่ต้องการ
        if (in_array($action, ['updateUserRole', 'updateUser', 'deleteUser']) && $_SESSION['user_role'] !== 'admin') {
            throw new Exception("Insufficient permissions. Admin access required.");
        }
    }


    switch ($action) {
        // --- User Authentication ---
        case 'registerUser':
            handleRegisterUser($pdo, $input);
            break;
        case 'loginUser':
            handleLoginUser($pdo, $input);
            break;
        case 'logoutUser':
            handleLogoutUser();
            break;
        case 'checkSession':
            handleCheckSession($pdo);
            break;
        
        // ===== START: โค้ดที่แก้ไข (ลบ action 'checkUserEmail' และปรับปรุง 'resetPassword') =====
        case 'resetPassword':
            handleResetPassword($pdo, $input);
            break;
        // ===== END: โค้ดที่แก้ไข =====

        // --- Data Retrieval ---
        case 'getAllData':
            handleGetAllData($pdo);
            break;
        case 'getRequestWithDetails':
            handleGetRequestWithDetails($pdo, $input);
            break;

        // --- Request Management ---
        case 'createRequest':
            handleCreateRequest($pdo, $input);
            break;
        case 'updateRequest':
            handleUpdateRequest($pdo, $input);
            break;
        case 'updateUserRequest':
            handleUpdateUserRequest($pdo, $input);
            break;
        case 'deleteRequest':
            handleDeleteRequest($pdo, $input);
            break;

        // --- Category Management ---
        case 'createOrUpdateCategory':
            handleCreateOrUpdateCategory($pdo, $input);
            break;
        case 'deleteCategory':
            handleDeleteCategory($pdo, $input);
            break;

        // --- Device Management ---
        case 'createOrUpdateDevice':
            handleCreateOrUpdateDevice($pdo, $input);
            break;
        case 'deleteDevice':
            handleDeleteDevice($pdo, $input);
            break;

        // --- User Management ---
        case 'updateUserRole':
            handleUpdateUserRole($pdo, $input, $_SESSION['user_id']);
            break;
        
        case 'updateUser':
            handleUpdateUser($pdo, $input);
            break;
        case 'deleteUser':
            handleDeleteUser($pdo, $input, $_SESSION['user_id']);
            break;

        default:
            http_response_code(404);
            echo json_encode(['status' => 'error', 'message' => "Action '{$action}' not found"]);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'An unexpected error occurred: ' . $e->getMessage()]);
}

// ############################################################################
// #                  ฟังก์ชันจัดการผู้ใช้ (User Auth Handlers)                #
// ############################################################################

function handleRegisterUser($pdo, $data) {
    if (empty($data['fullname']) || empty($data['email']) || empty($data['password'])) {
        throw new Exception("กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (ชื่อ, อีเมล, รหัสผ่าน)");
    }
    if (strlen($data['password']) > 8) {
        throw new Exception("รหัสผ่านต้องมีความยาวไม่เกิน 8 ตัวอักษร");
    }

    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$data['email']]);
    if ($stmt->fetch()) {
        throw new Exception("อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น");
    }
    $hashed_password = password_hash($data['password'], PASSWORD_DEFAULT);
    $sql = "INSERT INTO users (fullname, department, position, contact, email, password, role) VALUES (?, ?, ?, ?, ?, ?, 'user')";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $data['fullname'],
        $data['department'] ?? null,
        $data['position'] ?? null,
        $data['contact'] ?? null,
        $data['email'],
        $hashed_password
    ]);
    echo json_encode(['status' => 'success', 'message' => 'สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ']);
}

function handleLoginUser($pdo, $data) {
    if (empty($data['email']) || empty($data['password'])) {
        throw new Exception("กรุณากรอกอีเมลและรหัสผ่าน");
    }
    $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$data['email']]);
    $user = $stmt->fetch();
    if (!$user) {
        throw new Exception("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    }
    
    if (password_verify($data['password'], $user['password'])) {
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['user_fullname'] = $user['fullname'];
        $_SESSION['user_role'] = $user['role'];
        unset($user['password']);
        echo json_encode(['status' => 'success', 'message' => 'เข้าสู่ระบบสำเร็จ', 'user' => $user]);
    } else {
        throw new Exception("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    }
}

function handleLogoutUser() {
    session_unset();
    session_destroy();
    echo json_encode(['status' => 'success', 'message' => 'ออกจากระบบสำเร็จ']);
}

function handleCheckSession($pdo) {
    if (isset($_SESSION['user_id'])) {
        $stmt = $pdo->prepare("SELECT id, fullname, department, position, contact, email, role FROM users WHERE id = ?");
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch();
        if ($user) {
            echo json_encode(['status' => 'success', 'user' => $user]);
        } else {
            handleLogoutUser();
        }
    } else {
        throw new Exception("No active session.");
    }
}

// ===== START: ฟังก์ชันที่แก้ไขสำหรับลืมรหัสผ่านขั้นตอนเดียว =====
function handleResetPassword($pdo, $data) {
    if (empty($data['email']) || empty($data['newPassword'])) {
        throw new Exception("กรุณากรอกข้อมูลให้ครบถ้วน");
    }
    if (strlen($data['newPassword']) > 8) {
        throw new Exception("รหัสผ่านใหม่ต้องมีความยาวไม่เกิน 8 ตัวอักษร");
    }

    // 1. ตรวจสอบก่อนว่ามีอีเมลนี้ในระบบหรือไม่
    $stmt_check = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt_check->execute([$data['email']]);
    if (!$stmt_check->fetch()) {
        throw new Exception("ไม่พบอีเมลนี้ในระบบ กรุณาตรวจสอบอีกครั้ง");
    }

    // 2. ถ้ามีอีเมลอยู่จริง จึงทำการอัปเดตรหัสผ่าน
    $new_hashed_password = password_hash($data['newPassword'], PASSWORD_DEFAULT);
    $sql = "UPDATE users SET password = ? WHERE email = ?";
    $stmt_update = $pdo->prepare($sql);
    $stmt_update->execute([$new_hashed_password, $data['email']]);

    if ($stmt_update->rowCount() > 0) {
        echo json_encode(['status' => 'success', 'message' => 'ตั้งรหัสผ่านใหม่สำเร็จ']);
    } else {
        // กรณีนี้ไม่น่าเกิดขึ้นถ้าผ่านการตรวจสอบอีเมลแล้ว แต่อาจเกิดจากปัญหาอื่น
        throw new Exception("เกิดข้อผิดพลาด ไม่สามารถอัปเดตรหัสผ่านได้");
    }
}
// ===== END: ฟังก์ชันที่แก้ไข =====

function handleUpdateUserRole($pdo, $data, $current_admin_id) {
    if (empty($data['user_id']) || empty($data['role'])) {
        throw new Exception("User ID and new role are required.");
    }
    if (!in_array($data['role'], ['user', 'admin'])) {
        throw new Exception("Invalid role specified. Must be 'user' or 'admin'.");
    }

    $user_id_to_update = $data['user_id'];
    $new_role = $data['role'];

    if ($user_id_to_update == $current_admin_id && $new_role === 'user') {
        $stmt_check = $pdo->prepare("SELECT COUNT(*) FROM users WHERE role = 'admin'");
        $stmt_check->execute();
        $admin_count = $stmt_check->fetchColumn();
        if ($admin_count <= 1) {
            throw new Exception("ไม่สามารถลดสิทธิ์ของตัวเองได้ เนื่องจากคุณเป็นผู้ดูแลระบบคนสุดท้ายของระบบ");
        }
    }

    $sql = "UPDATE users SET role = ? WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$new_role, $user_id_to_update]);

    echo json_encode(['status' => 'success', 'message' => 'อัปเดตสิทธิ์ผู้ใช้งานเรียบร้อยแล้ว']);
}

function handleUpdateUser($pdo, $data) {
    if (empty($data['user_id']) || empty($data['fullname'])) {
        throw new Exception("User ID and Fullname are required.");
    }

    $user_id = $data['user_id'];
    $fullname = $data['fullname'];
    $department = $data['department'] ?? null;
    $position = $data['position'] ?? null;

    $sql = "UPDATE users SET fullname = ?, department = ?, position = ? WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$fullname, $department, $position, $user_id]);

    if ($stmt->rowCount() > 0) {
        echo json_encode(['status' => 'success', 'message' => 'อัปเดตข้อมูลผู้ใช้เรียบร้อยแล้ว']);
    } else {
        echo json_encode(['status' => 'success', 'message' => 'ไม่มีข้อมูลที่เปลี่ยนแปลง หรืออัปเดตข้อมูลผู้ใช้เรียบร้อยแล้ว']);
    }
}

function handleDeleteUser($pdo, $data, $current_admin_id) {
    if (empty($data['user_id'])) {
        throw new Exception("User ID is required for deletion.");
    }

    $user_id_to_delete = $data['user_id'];

    if ($user_id_to_delete == $current_admin_id) {
        throw new Exception("ไม่สามารถลบบัญชีผู้ดูแลระบบของตัวเองได้");
    }

    $stmt_check_role = $pdo->prepare("SELECT role FROM users WHERE id = ?");
    $stmt_check_role->execute([$user_id_to_delete]);
    $user_role = $stmt_check_role->fetchColumn();

    if ($user_role === 'admin') {
        $stmt_check_count = $pdo->prepare("SELECT COUNT(*) FROM users WHERE role = 'admin'");
        $stmt_check_count->execute();
        $admin_count = $stmt_check_count->fetchColumn();
        if ($admin_count <= 1) {
            throw new Exception("ไม่สามารถลบผู้ดูแลระบบคนสุดท้ายของระบบได้");
        }
    }
    
    $sql = "DELETE FROM users WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$user_id_to_delete]);

    if ($stmt->rowCount() > 0) {
        echo json_encode(['status' => 'success', 'message' => 'ลบผู้ใช้งานเรียบร้อยแล้ว']);
    } else {
        throw new Exception("ไม่พบผู้ใช้งานที่ต้องการลบ หรือเกิดข้อผิดพลาดในการลบ");
    }
}


// ############################################################################
// #                       ฟังก์ชันจัดการข้อมูล (Data Handlers)                #
// ############################################################################

function handleGetAllData($pdo) {
    $where_clause = "";
    $params = [];

    if (isset($_SESSION['user_role']) && $_SESSION['user_role'] === 'user' && isset($_SESSION['user_fullname'])) {
        $where_clause = " WHERE r.requester_name = ?";
        $params[] = $_SESSION['user_fullname'];
    }

    $sql_requests = "SELECT r.*, 
                           (SELECT GROUP_CONCAT(CONCAT(d.name, ' (', rd.quantity, ')') SEPARATOR ', ') 
                            FROM request_devices rd 
                            JOIN devices d ON rd.device_id = d.id 
                            WHERE rd.request_id = r.id) as device_list,
                           (SELECT SUM(rd.quantity)
                            FROM request_devices rd
                            WHERE rd.request_id = r.id) as total_quantity
                    FROM requests r 
                    {$where_clause}
                    ORDER BY r.created_at DESC";
    
    $stmt = $pdo->prepare($sql_requests);
    $stmt->execute($params);
    $requests = $stmt->fetchAll();

    $all_parts = $pdo->query("SELECT * FROM part_replacements")->fetchAll();
    $parts_by_request = [];
    foreach ($all_parts as $part) {
        $parts_by_request[$part['request_id']][] = $part;
    }
    foreach ($requests as &$req) {
        $req['history'] = json_decode($req['history'], true);
        $req['parts_replaced'] = $parts_by_request[$req['id']] ?? [];
    }
    unset($req);

    $categories = $pdo->query("SELECT * FROM categories ORDER BY id ASC")->fetchAll();
    $devices = $pdo->query("SELECT id, display_id, name, brand, available_quantity, image_data, device_type FROM devices ORDER BY name ASC")->fetchAll();
    $users = $pdo->query("SELECT id, fullname, email, department, position, role FROM users ORDER BY id ASC")->fetchAll();

    echo json_encode([
        'status' => 'success',
        'data' => [
            'requests' => $requests,
            'categories' => $categories,
            'devices' => $devices,
            'users' => $users,
        ]
    ]);
}

function handleGetRequestWithDetails($pdo, $data) {
    if (empty($data['id'])) {
        throw new Exception("Request ID is required.");
    }
    $request_id = $data['id'];

    $stmt_req = $pdo->prepare("SELECT * FROM requests WHERE id = ?");
    $stmt_req->execute([$request_id]);
    $request = $stmt_req->fetch();

    if (!$request) {
        throw new Exception("Request not found.");
    }
    $request['history'] = json_decode($request['history'], true);

    $stmt_dev = $pdo->prepare("SELECT d.id as device_id, rd.quantity, d.name, d.brand, d.image_data 
                               FROM request_devices rd 
                               JOIN devices d ON rd.device_id = d.id 
                               WHERE rd.request_id = ?");
    $stmt_dev->execute([$request_id]);
    $request['devices'] = $stmt_dev->fetchAll();

    $stmt_parts = $pdo->prepare("SELECT * FROM part_replacements WHERE request_id = ?");
    $stmt_parts->execute([$request_id]);
    $request['parts_replaced'] = $stmt_parts->fetchAll();

    echo json_encode(['status' => 'success', 'data' => $request]);
}

function handleCreateRequest($pdo, $data) {
    if (empty($data['type']) || empty($data['requesterName'])) {
        throw new Exception("Request type and requester name are required.");
    }

    $pdo->beginTransaction();
    try {
        if (isset($data['devices']) && is_array($data['devices'])) {
            foreach ($data['devices'] as $device) {
                $stmt = $pdo->prepare("SELECT available_quantity FROM devices WHERE id = ? FOR UPDATE");
                $stmt->execute([$device['id']]);
                $current_stock = $stmt->fetchColumn();
                if ($current_stock < $device['quantity']) {
                    throw new Exception("อุปกรณ์ไม่เพียงพอ");
                }
                $stmt_update = $pdo->prepare("UPDATE devices SET available_quantity = available_quantity - ? WHERE id = ?");
                $stmt_update->execute([$device['quantity'], $device['id']]);
            }
        }

        $display_id = generate_display_id($pdo, $data['type']);
        $initial_status = ($data['type'] === 'แจ้งซ่อม') ? 'รอดำเนินการ' : 'รออนุมัติ';
        $history = json_encode([['date' => get_current_thai_date_time(), 'action' => 'สร้างคำขอใหม่']]);
        
        $sql = "INSERT INTO requests (
                    display_id, request_type, status, 
                    requester_name, requester_department, requester_contact, 
                    subject, description, location, 
                    category_id, other_category_details, image_data, 
                    purpose, borrow_date, request_date, expected_return_date, 
                    history, asset_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $display_id, $data['type'], $initial_status,
            $data['requesterName'] ?? null, $data['requesterDepartment'] ?? null, $data['requesterContact'] ?? null,
            $data['subject'] ?? null, $data['description'] ?? null, $data['location'] ?? null,
            $data['category_id'] ?? null, $data['otherCategory'] ?? null, $data['imageData'] ?? null,
            $data['purpose'] ?? null, $data['borrowDate'] ?? null, $data['requestDate'] ?? null, $data['expectedReturnDate'] ?? null,
            $history,
            $data['asset_id'] ?? null
        ]);
        
        $request_id = $pdo->lastInsertId();

        if (isset($data['devices']) && is_array($data['devices']) && !empty($data['devices'])) {
            $sql_dev = "INSERT INTO request_devices (request_id, device_id, quantity) VALUES (?, ?, ?)";
            $stmt_dev = $pdo->prepare($sql_dev);
            foreach ($data['devices'] as $device) {
                $stmt_dev->execute([$request_id, $device['id'], $device['quantity']]);
            }
        }
        
        $pdo->commit();
        echo json_encode(['status' => 'success', 'message' => 'Request created successfully', 'new_id' => $request_id]);

    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function handleUpdateUserRequest($pdo, $data) {
    if (empty($data['id'])) {
        throw new Exception("Request ID is required for update.");
    }

    $pdo->beginTransaction();
    try {
        $stmt_check = $pdo->prepare("SELECT status, history FROM requests WHERE id = ? FOR UPDATE");
        $stmt_check->execute([$data['id']]);
        $request = $stmt_check->fetch();

        if (!$request) { throw new Exception("ไม่พบคำขอ"); }
        if (!in_array($request['status'], ['รอดำเนินการ', 'รออนุมัติ'])) { throw new Exception("ไม่สามารถแก้ไขคำขอได้ เนื่องจากกำลังดำเนินการอยู่"); }
        
        $sql = "UPDATE requests SET 
                    subject = ?, description = ?, location = ?, 
                    category_id = ?, other_category_details = ?, image_data = ?, 
                    purpose = ?, expected_return_date = ?, history = ?, asset_id = ?
                WHERE id = ?";
        
        $history_array = json_decode($request['history'], true);
        $history_array[] = ['date' => get_current_thai_date_time(), 'action' => 'แก้ไขข้อมูลโดยผู้ใช้'];
        $new_history_json = json_encode($history_array);
        
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $data['subject'] ?? null, $data['description'] ?? null, $data['location'] ?? null,
            $data['category_id'] ?? null, $data['otherCategory'] ?? null, $data['imageData'] ?? null,
            $data['purpose'] ?? null, $data['expectedReturnDate'] ?? null,
            $new_history_json,
            $data['asset_id'] ?? null,
            $data['id']
        ]);

        $pdo->commit();
        echo json_encode(['status' => 'success', 'message' => 'Request updated successfully']);

    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function handleUpdateRequest($pdo, $data) {
    if (empty($data['id']) || empty($data['status'])) {
        throw new Exception("Request ID and status are required for update.");
    }

    $pdo->beginTransaction();
    try {
        $stmt_old = $pdo->prepare("SELECT * FROM requests WHERE id = ? FOR UPDATE");
        $stmt_old->execute([$data['id']]);
        $old_request = $stmt_old->fetch();
        
        if (!$old_request) {
            throw new Exception("Request not found.");
        }

        if (isset($data['parts_replaced'])) {
            $stmt_delete_parts = $pdo->prepare("DELETE FROM part_replacements WHERE request_id = ?");
            $stmt_delete_parts->execute([$data['id']]);

            if (is_array($data['parts_replaced']) && !empty($data['parts_replaced'])) {
                $sql_part = "INSERT INTO part_replacements (request_id, part_name, quantity, price) VALUES (?, ?, ?, ?)";
                $stmt_part = $pdo->prepare($sql_part);
                foreach ($data['parts_replaced'] as $part) {
                    if (!empty($part['part_name']) && isset($part['quantity']) && isset($part['price'])) {
                        $stmt_part->execute([$data['id'], $part['part_name'], $part['quantity'], $part['price']]);
                    }
                }
            }
        }
        
        $history_array = json_decode($old_request['history'], true);
        $history_entry = ['date' => get_current_thai_date_time(), 'action' => 'อัปเดตสถานะเป็น "' . $data['status'] . '" โดย ' . ($data['assignee'] ?? 'Admin')];
        if (!empty($data['adminNotes']) && $data['adminNotes'] !== $old_request['admin_notes']) {
            $history_entry['action'] .= '. บันทึก: ' . $data['adminNotes'];
        }
        $history_array[] = $history_entry;
        $new_history_json = json_encode($history_array);

        $sql = "UPDATE requests SET status = ?, assignee = ?, admin_notes = ?, history = ? WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([
            $data['status'], $data['assignee'] ?? 'ยังไม่ได้มอบหมาย', $data['adminNotes'] ?? null,
            $new_history_json, $data['id']
        ]);

        $pdo->commit();
        echo json_encode(['status' => 'success', 'message' => 'Request updated successfully']);
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function handleDeleteRequest($pdo, $data) {
    if (empty($data['id'])) {
        throw new Exception("Request ID is required.");
    }
    $sql = "DELETE FROM requests WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$data['id']]);
    echo json_encode(['status' => 'success', 'message' => 'Request deleted successfully']);
}

function handleCreateOrUpdateCategory($pdo, $data) {
    if (empty($data['name'])) {
        throw new Exception("Category name is required.");
    }
    if (!empty($data['id'])) {
        $sql = "UPDATE categories SET name = ? WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$data['name'], $data['id']]);
        $message = 'Category updated successfully';
    } else {
        $sql = "INSERT INTO categories (name) VALUES (?)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$data['name']]);
        $message = 'Category created successfully';
    }
    echo json_encode(['status' => 'success', 'message' => $message]);
}

function handleDeleteCategory($pdo, $data) {
    if (empty($data['id'])) {
        throw new Exception("Category ID is required.");
    }
    $stmt_check = $pdo->prepare("SELECT COUNT(*) FROM requests WHERE category_id = ?");
    $stmt_check->execute([$data['id']]);
    if ($stmt_check->fetchColumn() > 0) {
        throw new Exception("ไม่สามารถลบหมวดหมู่นี้ได้ เนื่องจากมีรายการแจ้งซ่อมที่ใช้งานหมวดหมู่นี้อยู่");
    }
    $sql = "DELETE FROM categories WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$data['id']]);
    echo json_encode(['status' => 'success', 'message' => 'Category deleted successfully']);
}

function handleCreateOrUpdateDevice($pdo, $data) {
    if (empty($data['name']) || !isset($data['available']) || empty($data['device_type'])) {
        throw new Exception("Device name, available quantity, and type are required.");
    }

    if (!empty($data['id'])) {
        $sql = "UPDATE devices SET name = ?, brand = ?, available_quantity = ?, image_data = ?, device_type = ? WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$data['name'], $data['brand'], $data['available'], $data['imageData'], $data['device_type'], $data['id']]);
        $message = 'Device updated successfully';
    } else {
        $display_id = generate_device_display_id($pdo, $data['device_type']);
        $sql = "INSERT INTO devices (display_id, name, brand, available_quantity, image_data, device_type) VALUES (?, ?, ?, ?, ?, ?)";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$display_id, $data['name'], $data['brand'], $data['available'], $data['imageData'], $data['device_type']]);
        $message = 'Device created successfully';
    }
    echo json_encode(['status' => 'success', 'message' => $message]);
}

function handleDeleteDevice($pdo, $data) {
    if (empty($data['id'])) {
        throw new Exception("Device ID is required.");
    }
    $stmt_check = $pdo->prepare("SELECT COUNT(*) FROM request_devices WHERE device_id = ?");
    $stmt_check->execute([$data['id']]);
    if ($stmt_check->fetchColumn() > 0) {
        throw new Exception("ไม่สามารถลบอุปกรณ์ได้ เนื่องจากมีรายการยืม-คืนหรือเบิกที่ใช้งานอุปกรณ์นี้อยู่");
    }
    $sql = "DELETE FROM devices WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$data['id']]);
    echo json_encode(['status' => 'success', 'message' => 'Device deleted successfully']);
}

// ############################################################################
// #                         ฟังก์ชันเสริม (Helpers)                           #
// ############################################################################

function generate_display_id($pdo, $type) {
    $prefix_map = [
        'แจ้งซ่อม' => 'IT', 
        'ยืม-คืนอุปกรณ์' => 'BOR', 
        'เบิกอุปกรณ์' => 'REQ'
    ];
    $prefix = $prefix_map[$type] ?? 'GEN';
    
    $date = new DateTime();
    $day = $date->format('d');
    $month = $date->format('m');
    $buddhist_year = (int)$date->format('Y') + 543;
    $year_short = substr((string)$buddhist_year, -2);

    $date_prefix = $day . $month . $year_short;
    $full_prefix = $prefix . '-' . $date_prefix;

    $sql = "SELECT display_id FROM requests WHERE display_id LIKE ? ORDER BY id DESC LIMIT 1";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(["$full_prefix%"]);
    $last_id = $stmt->fetchColumn();
    
    $next_number = 1;
    if ($last_id) {
        $parts = explode('-', $last_id);
        $last_number = (int) end($parts);
        $next_number = $last_number + 1;
    }
    
    return $full_prefix . '-' . str_pad($next_number, 2, '0', STR_PAD_LEFT);
}

function generate_device_display_id($pdo, $type) {
    $prefix_map = [
        'borrow' => 'BOR-DEV', 
        'withdraw' => 'REQ-DEV'
    ];
    $prefix = $prefix_map[$type] ?? 'DEV';

    $sql = "SELECT display_id FROM devices WHERE display_id LIKE ? ORDER BY id DESC LIMIT 1";
    $stmt = $pdo->prepare($sql);
    $stmt->execute(["$prefix%"]);
    $last_id = $stmt->fetchColumn();
    
    $next_number = 1;
    if ($last_id) {
        $parts = explode('-', $last_id);
        $last_number = (int) end($parts);
        $next_number = $last_number + 1;
    }
    
    return $prefix . '-' . str_pad($next_number, 3, '0', STR_PAD_LEFT);
}

function get_current_thai_date_time() {
    $date = new DateTime();
    $year = $date->format('Y') + 543;
    return $date->format('d/m/') . $year . ' ' . $date->format('H:i');
}
?>
