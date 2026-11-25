const fs = require('fs');
const path = require('path');

function escapeXml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

class DrawioBuilder {
  constructor() {
    this.diagrams = [];
  }

  addDiagram(id, name, width, height, elementsCallback) {
    const elements = [];
    let currentId = 2;
    const nextId = () => `cell_${currentId++}`;

    const helper = {
      createEntity: (x, y, w, title, fields, color = '#1e293b', headerColor = '#0f172a') => {
        const headerId = nextId();
        const rowHeight = 24;
        const totalHeight = 36 + fields.length * rowHeight;

        // Container / Header
        elements.push(`
        <mxCell id="${headerId}" value="&lt;b&gt;${escapeXml(title)}&lt;/b&gt;" style="swimlane;fontStyle=0;childLayout=stackLayout;horizontal=1;startSize=32;horizontalStack=0;resizeParent=1;resizeParentMax=0;resizeLast=0;collapsible=0;marginBottom=0;whiteSpace=wrap;html=1;fillColor=${headerColor};strokeColor=#334155;fontColor=#ffffff;fontFamily=Arial;fontSize=13;align=center;" vertex="1" parent="1">
          <mxGeometry x="${x}" y="${y}" width="${w}" height="${totalHeight}" as="geometry"/>
        </mxCell>`);

        // Fields
        fields.forEach((f, idx) => {
          const rowId = nextId();
          const isPK = f.pk;
          const isFK = f.fk;
          let prefix = '&amp;nbsp;&amp;nbsp;';
          if (isPK) prefix = '&lt;b style=&quot;color:#f59e0b;&quot;&gt;[PK]&lt;/b&gt; ';
          else if (isFK) prefix = '&lt;b style=&quot;color:#38bdf8;&quot;&gt;[FK]&lt;/b&gt; ';

          const fieldText = `${prefix}${escapeXml(f.name)}: &lt;i style=&quot;color:#94a3b8;&quot;&gt;${escapeXml(f.type)}&lt;/i&gt;`;
          elements.push(`
        <mxCell id="${rowId}" value="${fieldText}" style="text;strokeColor=none;fillColor=${idx % 2 === 0 ? '#1e293b' : '#0f172a'};align=left;verticalAlign=middle;spacingLeft=8;spacingRight=4;overflow=hidden;rotatable=0;points=[[0,0.5],[1,0.5]];portConstraint=eastwest;whiteSpace=wrap;html=1;fontColor=#f8fafc;fontFamily=Arial;fontSize=11;" vertex="1" parent="${headerId}">
          <mxGeometry y="${32 + idx * rowHeight}" width="${w}" height="${rowHeight}" as="geometry"/>
        </mxCell>`);
        });

        return headerId;
      },

      createConnector: (sourceId, targetId, label = '', sourceMulti = '1', targetMulti = 'N') => {
        const edgeId = nextId();
        elements.push(`
        <mxCell id="${edgeId}" value="${escapeXml(label)}" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;exitX=1;exitY=0.5;exitDx=0;exitDy=0;entryX=0;entryY=0.5;entryDx=0;entryDy=0;strokeColor=#64748b;strokeWidth=2;fontSize=11;fontColor=#334155;fontFamily=Arial;startArrow=ERone;startFill=0;endArrow=ERmany;endFill=0;" edge="1" parent="1" source="${sourceId}" target="${targetId}">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>`);
        return edgeId;
      },

      createCustomConnector: (sourceId, targetId, label, exitConstraint, entryConstraint) => {
        const edgeId = nextId();
        elements.push(`
        <mxCell id="${edgeId}" value="${escapeXml(label)}" style="edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;jettySize=auto;html=1;${exitConstraint};${entryConstraint};strokeColor=#64748b;strokeWidth=2;fontSize=11;fontColor=#334155;fontFamily=Arial;startArrow=ERone;startFill=0;endArrow=ERmany;endFill=0;" edge="1" parent="1" source="${sourceId}" target="${targetId}">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>`);
        return edgeId;
      },

      createActor: (x, y, label, color = '#e11d48') => {
        const id = nextId();
        elements.push(`
        <mxCell id="${id}" value="&lt;b&gt;${escapeXml(label)}&lt;/b&gt;" style="shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;fillColor=${color};strokeColor=#be123c;strokeWidth=2;fontColor=#0f172a;fontSize=12;fontFamily=Arial;" vertex="1" parent="1">
          <mxGeometry x="${x}" y="${y}" width="45" height="85" as="geometry"/>
        </mxCell>`);
        return id;
      },

      createUseCase: (x, y, w, h, label, bg = '#f8fafc', stroke = '#0284c7') => {
        const id = nextId();
        elements.push(`
        <mxCell id="${id}" value="${escapeXml(label)}" style="ellipse;whiteSpace=wrap;html=1;fillColor=${bg};strokeColor=${stroke};strokeWidth=2;fontColor=#0f172a;fontSize=12;fontFamily=Arial;shadow=1;" vertex="1" parent="1">
          <mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/>
        </mxCell>`);
        return id;
      },

      createSystemBoundary: (x, y, w, h, title) => {
        const id = nextId();
        elements.push(`
        <mxCell id="${id}" value="&lt;b&gt;${escapeXml(title)}&lt;/b&gt;" style="swimlane;startSize=32;fillColor=#f8fafc;strokeColor=#cbd5e1;strokeWidth=2;fontColor=#0f172a;fontSize=14;fontFamily=Arial;rounded=1;arcSize=3;" vertex="1" parent="1">
          <mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/>
        </mxCell>`);
        return id;
      },

      createAssociation: (actorId, useCaseId) => {
        const edgeId = nextId();
        elements.push(`
        <mxCell id="${edgeId}" style="endArrow=none;html=1;strokeColor=#475569;strokeWidth=1.5;rounded=0;" edge="1" parent="1" source="${actorId}" target="${useCaseId}">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>`);
        return edgeId;
      },

      createInclude: (sourceId, targetId) => {
        const edgeId = nextId();
        elements.push(`
        <mxCell id="${edgeId}" value="&amp;lt;&amp;lt;include&amp;gt;&amp;gt;" style="endArrow=open;dashed=1;html=1;endFill=0;strokeColor=#0284c7;strokeWidth=1.5;fontColor=#0369a1;fontSize=10;fontFamily=Arial;rounded=0;" edge="1" parent="1" source="${sourceId}" target="${targetId}">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>`);
        return edgeId;
      },

      createExtend: (sourceId, targetId) => {
        const edgeId = nextId();
        elements.push(`
        <mxCell id="${edgeId}" value="&amp;lt;&amp;lt;extend&amp;gt;&amp;gt;" style="endArrow=open;dashed=1;html=1;endFill=0;strokeColor=#e11d48;strokeWidth=1.5;fontColor=#be123c;fontSize=10;fontFamily=Arial;rounded=0;" edge="1" parent="1" source="${sourceId}" target="${targetId}">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>`);
        return edgeId;
      },
    };

    elementsCallback(helper);

    this.diagrams.push(`
  <diagram id="${id}" name="${escapeXml(name)}">
    <mxGraphModel dx="1600" dy="1000" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${width}" pageHeight="${height}" background="#ffffff">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
        ${elements.join('\n')}
      </root>
    </mxGraphModel>
  </diagram>`);
  }

  build() {
    return `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="Fivecore Cinema DrawIO Generator" version="24.7.5">
${this.diagrams.join('\n')}
</mxfile>`;
  }
}

// --------------------------------------------------------------------------
// Khởi tạo đồ thị
// --------------------------------------------------------------------------
const builder = new DrawioBuilder();

// ==========================================================================
// TAB 1: SƠ ĐỒ THỰC THỂ ERD
// ==========================================================================
builder.addDiagram('ERD_Main', '1. Sơ Đồ Thực Thể ERD', 2100, 1500, (g) => {
  // Cột 1: Rạp & Phòng
  const theaterId = g.createEntity(60, 60, 240, 'THEATER (Cụm Rạp)', [
    { name: '_id', type: 'ObjectId', pk: true },
    { name: 'name', type: 'string' },
    { name: 'address', type: 'string' },
    { name: 'region', type: 'enum (Bắc/Trung/Nam)' },
    { name: 'city', type: 'string' },
    { name: 'district', type: 'string' },
    { name: 'ward', type: 'string' },
    { name: 'location.lat', type: 'number' },
    { name: 'location.lng', type: 'number' },
    { name: 'hotline', type: 'string' },
    { name: 'createdAt', type: 'Date' },
  ], '#1e293b', '#0f172a');

  const roomId = g.createEntity(60, 340, 240, 'ROOM (Phòng Chiếu)', [
    { name: '_id', type: 'ObjectId', pk: true },
    { name: 'theater', type: 'ObjectId', fk: true },
    { name: 'name', type: 'string' },
    { name: 'capacity', type: 'number' },
    { name: 'seatLayout[]', type: 'array' },
    { name: 'seatSurcharges', type: 'object' },
    { name: 'createdAt', type: 'Date' },
  ], '#1e293b', '#0f172a');

  // Cột 2: Phim & Suất chiếu & Pricing Rule
  const movieId = g.createEntity(380, 60, 250, 'MOVIE (Phim Chiếu)', [
    { name: '_id', type: 'ObjectId', pk: true },
    { name: 'title', type: 'string' },
    { name: 'description', type: 'string' },
    { name: 'duration', type: 'number' },
    { name: 'releaseDate', type: 'Date' },
    { name: 'genre[]', type: 'array' },
    { name: 'director', type: 'string' },
    { name: 'actors[]', type: 'array' },
    { name: 'status', type: 'enum' },
  ], '#1e293b', '#0f172a');

  const showtimeId = g.createEntity(380, 400, 250, 'SHOWTIME (Suất Chiếu)', [
    { name: '_id', type: 'ObjectId', pk: true },
    { name: 'movie', type: 'ObjectId', fk: true },
    { name: 'theater', type: 'ObjectId', fk: true },
    { name: 'room', type: 'ObjectId', fk: true },
    { name: 'startTime', type: 'Date' },
    { name: 'endTime', type: 'Date' },
    { name: 'price', type: 'number' },
    { name: 'breakMinutes', type: 'number' },
    { name: 'isEarlyAccess', type: 'boolean' },
    { name: 'status', type: 'enum' },
  ], '#1e293b', '#0f172a');

  const pricingRuleId = g.createEntity(380, 770, 250, 'PRICING_RULE (Giá Động)', [
    { name: '_id', type: 'ObjectId', pk: true },
    { name: 'key', type: 'string' },
    { name: 'timeSlots[]', type: 'array' },
    { name: 'weekendSurcharge', type: 'number' },
    { name: 'holidays[]', type: 'array' },
  ], '#1e293b', '#0f172a');

  // Cột 3: Vé xem phim (Ticket) & Voucher
  const ticketId = g.createEntity(720, 140, 320, 'TICKET (Vé Đã Đặt / Giữ Chỗ)', [
    { name: '_id', type: 'ObjectId', pk: true },
    { name: 'code', type: 'string' },
    { name: 'user', type: 'ObjectId', fk: true },
    { name: 'showtime', type: 'ObjectId', fk: true },
    { name: 'seats[]', type: 'array' },
    { name: 'combos[]', type: 'array' },
    { name: 'totalAmount', type: 'number' },
    { name: 'discount', type: 'number' },
    { name: 'voucherCode', type: 'string' },
    { name: 'paymentMethod', type: 'string' },
    { name: 'paymentReference', type: 'string' },
    { name: 'status', type: 'enum' },
    { name: 'isUsed', type: 'boolean' },
    { name: 'usedBy', type: 'ObjectId', fk: true },
    { name: 'soldBy', type: 'ObjectId', fk: true },
    { name: 'customerName', type: 'string' },
    { name: 'customerPhone', type: 'string' },
    { name: 'customerEmail', type: 'string' },
    { name: 'cashReceived', type: 'number' },
    { name: 'stockDeducted', type: 'boolean' },
    { name: 'lockedUntil', type: 'Date' },
    { name: 'qrCode', type: 'string' },
    { name: 'paidAt', type: 'Date' },
  ], '#1e293b', '#0f172a');

  const voucherId = g.createEntity(720, 800, 320, 'VOUCHER (Khuyến Mãi)', [
    { name: '_id', type: 'ObjectId', pk: true },
    { name: 'code', type: 'string' },
    { name: 'description', type: 'string' },
    { name: 'discountType', type: 'enum' },
    { name: 'discountValue', type: 'number' },
    { name: 'maxDiscount', type: 'number' },
    { name: 'minOrderValue', type: 'number' },
    { name: 'startDate', type: 'Date' },
    { name: 'endDate', type: 'Date' },
    { name: 'usageLimit', type: 'number' },
    { name: 'usageCount', type: 'number' },
    { name: 'isActive', type: 'boolean' },
  ], '#1e293b', '#0f172a');

  // Cột 4: User, Combo, Nhập Kho
  const userId = g.createEntity(1140, 60, 260, 'USER (Người Dùng & Nhân Viên)', [
    { name: '_id', type: 'ObjectId', pk: true },
    { name: 'fullName', type: 'string' },
    { name: 'email', type: 'string' },
    { name: 'password', type: 'string' },
    { name: 'phone', type: 'string' },
    { name: 'role', type: 'enum (admin/manager/staff/user)' },
    { name: 'isActive', type: 'boolean' },
    { name: 'avatar', type: 'string' },
  ], '#1e293b', '#0f172a');

  const comboId = g.createEntity(1140, 400, 260, 'COMBO (Bắp Nước & Kho)', [
    { name: '_id', type: 'ObjectId', pk: true },
    { name: 'name', type: 'string' },
    { name: 'price', type: 'number' },
    { name: 'costPrice', type: 'number' },
    { name: 'stock', type: 'number' },
    { name: 'minStock', type: 'number' },
    { name: 'items[]', type: 'array' },
    { name: 'flavors[]', type: 'array' },
    { name: 'isActive', type: 'boolean' },
  ], '#1e293b', '#0f172a');

  const receiptId = g.createEntity(1140, 770, 260, 'IMPORT_RECEIPT (Phiếu Nhập)', [
    { name: '_id', type: 'ObjectId', pk: true },
    { name: 'code', type: 'string' },
    { name: 'importDate', type: 'Date' },
    { name: 'supplier', type: 'string' },
    { name: 'items[]', type: 'array' },
    { name: 'totalAmount', type: 'number' },
    { name: 'createdBy', type: 'ObjectId', fk: true },
    { name: 'createdByName', type: 'string' },
  ], '#1e293b', '#0f172a');

  // Connectors
  g.createConnector(theaterId, roomId, 'chứa (1-n)');
  g.createConnector(roomId, showtimeId, 'chiếu tại (1-n)');
  g.createConnector(movieId, showtimeId, 'lên lịch (1-n)');
  g.createConnector(pricingRuleId, showtimeId, 'áp giá');
  g.createConnector(showtimeId, ticketId, 'phát hành (1-n)');
  g.createConnector(userId, ticketId, 'đặt / bán / soát (1-n)');
  g.createConnector(voucherId, ticketId, 'áp dụng (0-n)');
  g.createConnector(comboId, ticketId, 'chọn mua (0-n)');
  g.createConnector(comboId, receiptId, 'nhập kho (1-n)');
  g.createConnector(userId, receiptId, 'tạo phiếu (1-n)');
});

// ==========================================================================
// TAB 2: SƠ ĐỒ USE CASE TỔNG QUAN
// ==========================================================================
builder.addDiagram('UseCase_System', '2. Sơ Đồ Use Case Tổng Quan', 1900, 1300, (g) => {
  // Boundary
  g.createSystemBoundary(260, 40, 1320, 1180, 'HỆ THỐNG QUẢN LÝ & ĐẶT VÉ XEM PHIM (FIVECORE / CINOPS)');

  // Actors
  const actorClient = g.createActor(80, 220, 'Khách Hàng\n(Client / User)', '#e11d48');
  const actorStaff = g.createActor(80, 660, 'Nhân Viên Quầy\n(Staff / POS)', '#2563eb');
  const actorManager = g.createActor(80, 1020, 'Quản Lý Rạp\n(Cinema Manager)', '#0891b2');
  const actorAdmin = g.createActor(1680, 280, 'Quản Trị Viên\n(System Admin)', '#7c3aed');
  const actorPayment = g.createActor(1680, 800, 'Cổng SePay\nVietQR Bank', '#059669');

  // Client Use Cases
  const ucViewMovies = g.createUseCase(320, 100, 210, 60, 'Xem danh sách & chi tiết phim');
  const ucPickShowtime = g.createUseCase(320, 190, 210, 60, 'Tìm lịch chiếu theo Rạp / Ngày');
  const ucChooseSeats = g.createUseCase(320, 280, 210, 60, 'Chọn ghế & Kiểm tra Orphan Seat');
  const ucHoldSeat = g.createUseCase(580, 280, 200, 55, 'Khóa giữ ghế (5 phút đếm lùi)');
  const ucSelectCombo = g.createUseCase(320, 370, 210, 60, 'Chọn Combo bắp nước F&B');
  const ucApplyVoucher = g.createUseCase(320, 460, 210, 60, 'Áp dụng mã giảm giá Voucher');
  const ucPayQR = g.createUseCase(320, 550, 210, 60, 'Thanh toán SePay VietQR (Auto)');
  const ucViewHistory = g.createUseCase(320, 640, 210, 60, 'Xem lịch sử & Tách cuống vé QR');
  const ucEmailNotif = g.createUseCase(580, 550, 200, 55, 'Gửi mã vé & QR về Gmail');

  // Staff Use Cases
  const ucPOSSell = g.createUseCase(320, 780, 220, 65, 'Bán vé tại quầy (POS)');
  const ucPOSCash = g.createUseCase(580, 780, 200, 55, 'Thanh toán tiền mặt & In hóa đơn');
  const ucStaffLookup = g.createUseCase(320, 880, 220, 65, 'Tra cứu đơn (Mã vé / SĐT / Mã HĐ)');
  const ucStaffPrint = g.createUseCase(320, 980, 220, 65, 'In cuống vé rời từng ghế & F&B');
  const ucStaffCheckin = g.createUseCase(320, 1080, 220, 65, 'Quét mã QR soát vé vào rạp');

  // Admin Use Cases
  const ucManageMovie = g.createUseCase(1020, 100, 230, 60, 'Quản lý Phim (Thêm/Sửa/Trạng thái)');
  const ucManageCinema = g.createUseCase(1020, 180, 230, 60, 'Quản lý Cụm Rạp & Phòng Chiếu');
  const ucManageSeat = g.createUseCase(1290, 180, 210, 55, 'Thiết lập ma trận sơ đồ ghế');
  const ucManageShowtime = g.createUseCase(1020, 260, 230, 60, 'Xếp lịch chiếu (Chống trùng giờ)');
  const ucManagePricing = g.createUseCase(1020, 340, 230, 60, 'Cấu hình quy định giá vé động');
  const ucManageInventory = g.createUseCase(1020, 420, 230, 60, 'Quản lý Kho bắp nước & Nhập hàng');
  const ucManageVoucher = g.createUseCase(1020, 500, 230, 60, 'Quản lý khuyến mãi Voucher');
  const ucManageUser = g.createUseCase(1020, 580, 230, 60, 'Quản lý tài khoản & Phân quyền');
  const ucAnalytics = g.createUseCase(1020, 660, 240, 60, 'Báo cáo Doanh thu rạp & Độ hot phim');

  // External / System Use Cases
  const ucWebhook = g.createUseCase(1020, 800, 240, 65, 'Xử lý SePay Webhook biến động số dư');

  // Links: Client
  g.createAssociation(actorClient, ucViewMovies);
  g.createAssociation(actorClient, ucPickShowtime);
  g.createAssociation(actorClient, ucChooseSeats);
  g.createInclude(ucChooseSeats, ucHoldSeat);
  g.createAssociation(actorClient, ucSelectCombo);
  g.createAssociation(actorClient, ucApplyVoucher);
  g.createAssociation(actorClient, ucPayQR);
  g.createInclude(ucPayQR, ucEmailNotif);
  g.createAssociation(actorClient, ucViewHistory);

  // Links: Staff
  g.createAssociation(actorStaff, ucPOSSell);
  g.createInclude(ucPOSSell, ucPOSCash);
  g.createAssociation(actorStaff, ucStaffLookup);
  g.createAssociation(actorStaff, ucStaffPrint);
  g.createAssociation(actorStaff, ucStaffCheckin);

  // Links: Manager (Điều hành cụm rạp & quầy vé)
  g.createAssociation(actorManager, ucManageCinema);
  g.createAssociation(actorManager, ucManageShowtime);
  g.createAssociation(actorManager, ucPOSSell);
  g.createAssociation(actorManager, ucStaffLookup);
  g.createAssociation(actorManager, ucAnalytics);

  // Links: Admin
  g.createAssociation(actorAdmin, ucManageMovie);
  g.createAssociation(actorAdmin, ucManageCinema);
  g.createInclude(ucManageCinema, ucManageSeat);
  g.createAssociation(actorAdmin, ucManageShowtime);
  g.createAssociation(actorAdmin, ucManagePricing);
  g.createAssociation(actorAdmin, ucManageInventory);
  g.createAssociation(actorAdmin, ucManageVoucher);
  g.createAssociation(actorAdmin, ucManageUser);
  g.createAssociation(actorAdmin, ucAnalytics);

  // Links: Payment
  g.createAssociation(actorPayment, ucWebhook);
  g.createExtend(ucWebhook, ucPayQR);
});

// ==========================================================================
// TAB 3: LUỒNG CHI TIẾT ĐẶT VÉ & POS
// ==========================================================================
builder.addDiagram('UseCase_Detail', '3. Chi Tiết Đặt Vé & POS', 1800, 1200, (g) => {
  g.createSystemBoundary(200, 40, 1380, 1080, 'QUY TRÌNH NGHIỆP VỤ ĐẶT VÉ TRỰC TUYẾN & QUẦY VÉ POS');

  const actorUser = g.createActor(60, 300, 'Khách Hàng', '#e11d48');
  const actorStaff2 = g.createActor(60, 750, 'Nhân Viên POS', '#2563eb');

  // Client Flow
  const step1 = g.createUseCase(260, 100, 220, 60, '1. Chọn suất chiếu rạp');
  const step2 = g.createUseCase(540, 100, 230, 60, '2. Chọn ghế ngồi phòng chiếu');
  const step3 = g.createUseCase(830, 100, 230, 60, '3. Kiểm tra ghế đơn lẻ (Orphan)');
  const step4 = g.createUseCase(1120, 100, 220, 60, '4. Giữ ghế (Hold Seat 5 min)');
  const step5 = g.createUseCase(260, 260, 220, 60, '5. Thêm combo bắp nước');
  const step6 = g.createUseCase(540, 260, 220, 60, '6. Áp mã giảm giá Voucher');
  const step7 = g.createUseCase(830, 260, 230, 60, '7. Mở popup VietQR SePay');
  const step8 = g.createUseCase(1120, 260, 240, 60, '8. Chuyển khoản VietQR (kể cả test 1đ)');
  const step9 = g.createUseCase(680, 400, 260, 65, '9. Hoàn tất đơn & Sinh mã QR vé', '#dcfce7', '#16a34a');
  const step10 = g.createUseCase(1020, 400, 260, 65, '10. Gửi vé & QR qua Gmail SMTP (tự động)', '#eff6ff', '#2563eb');

  g.createAssociation(actorUser, step1);
  g.createInclude(step1, step2);
  g.createInclude(step2, step3);
  g.createInclude(step3, step4);
  g.createInclude(step4, step5);
  g.createInclude(step5, step6);
  g.createInclude(step6, step7);
  g.createInclude(step7, step8);
  g.createInclude(step8, step9);
  g.createInclude(step9, step10);

  // Staff Flow
  const pos1 = g.createUseCase(260, 680, 230, 60, 'Bán vé trực tiếp cho khách');
  const pos2 = g.createUseCase(550, 680, 230, 60, 'Thu tiền mặt / Chuyển khoản');
  const pos3 = g.createUseCase(840, 680, 240, 65, 'Tách in N cuống vé riêng từng ghế', '#fef3c7', '#d97706');
  const pos4 = g.createUseCase(1140, 680, 240, 65, 'In phiếu nhận Bắp Nước F&B', '#fef3c7', '#d97706');

  const checkin1 = g.createUseCase(400, 880, 260, 65, 'Tra cứu bằng Mã HĐ / SĐT / Mã Vé');
  const checkin2 = g.createUseCase(780, 880, 260, 65, 'Quét mã QR tổng hoặc mã vé con');
  const checkin3 = g.createUseCase(1140, 880, 240, 65, 'Xác nhận vào rạp (isUsed=true)', '#dcfce7', '#16a34a');

  g.createAssociation(actorStaff2, pos1);
  g.createInclude(pos1, pos2);
  g.createInclude(pos2, pos3);
  g.createInclude(pos3, pos4);

  g.createAssociation(actorStaff2, checkin1);
  g.createAssociation(actorStaff2, checkin2);
  g.createInclude(checkin2, checkin3);
});

// Xuất file diagram.drawio
const xmlContent = builder.build();
const outputPath = path.join(__dirname, '../../../diagram.drawio');
fs.writeFileSync(outputPath, xmlContent, 'utf8');

console.log(`Đã xuất thành công file Draw.io tại: ${outputPath}`);
console.log(`Dung lượng file: ${Buffer.byteLength(xmlContent, 'utf8')} bytes`);
