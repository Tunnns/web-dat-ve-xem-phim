import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const EDGE_PATH = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:5000/api';

const SCREENSHOT_DIR = path.join(__dirname, '../../../screenshots');
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fillInput(page: any, selector: string, value: string) {
  await page.waitForSelector(selector, { timeout: 10000 });
  await page.evaluate((sel: string, val: string) => {
    const input = document.querySelector(sel) as HTMLInputElement;
    if (input) {
      input.focus();
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (setter) {
        setter.call(input, val);
      } else {
        input.value = val;
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, selector, value);
  await sleep(150);
}

async function runBrowserTest() {
  console.log('================================================================');
  console.log('  TESTING REAL PHYSICAL BROWSER INTERACTION (HEADFUL CHROME)   ');
  console.log('================================================================\n');

  const browserPath = fs.existsSync(CHROME_PATH) ? CHROME_PATH : EDGE_PATH;
  console.log('[1] Khoi dong trinh duyet thuc te:', browserPath);

  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: false,
    defaultViewport: { width: 1280, height: 850 },
    args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox'],
  });

  const [page] = await browser.pages();

  page.on('console', (msg) => {
    const text = msg.text();
    if (!text.includes('[vite]') && !text.includes('React DevTools')) {
      console.log('  [BROWSER CONSOLE]', msg.type(), text);
    }
  });
  page.on('pageerror', (err: any) => console.error('  [BROWSER ERROR]', err?.message || String(err)));

  try {
    // -------------------------------------------------------------------------
    // BUOC 1: TRUY CAP TRANG CHU
    // -------------------------------------------------------------------------
    console.log('\n[BUOC 1] Mo trang chu:', BASE_URL);
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    await sleep(1500);
    await page.evaluate(() => localStorage.clear());
    const ss1 = path.join(SCREENSHOT_DIR, '01_trang_chu.png');
    await page.screenshot({ path: ss1 });
    console.log(`  -> Da chup anh: ${ss1}`);

    // -------------------------------------------------------------------------
    // BUOC 2: DANG KY TAI KHOAN MOI
    // -------------------------------------------------------------------------
    const randomSuffix = Math.floor(1000000 + Math.random() * 9000000);
    const testEmail = `tuan_real_user_${randomSuffix}@gmail.com`;
    const testName = `Nguyen Tuan Real ${randomSuffix}`;
    const testPhone = `098${randomSuffix}`;
    const testPass = 'Password123';

    console.log('\n[BUOC 2] Chuyen sang trang Dang ky tai khoan...');
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle2' });

    console.log('  -> Dang dien form dang ky: ho ten, email, sdt, mat khau...');
    await fillInput(page, '#reg-name', testName);
    await fillInput(page, '#reg-email', testEmail);
    await fillInput(page, '#reg-phone', testPhone);
    await fillInput(page, '#reg-password', testPass);
    await fillInput(page, '#reg-confirm', testPass);

    const ss2 = path.join(SCREENSHOT_DIR, '02_dang_ky_form.png');
    await page.screenshot({ path: ss2 });
    console.log(`  -> Da chup anh form dang ky: ${ss2}`);

    console.log('  -> Bam nut Dang ky tai khoan...');
    await page.click('#register-submit');
    await page.waitForSelector('p[role="status"]', { timeout: 8000 }).catch(() => {});
    await sleep(2000);

    // -------------------------------------------------------------------------
    // BUOC 3: DANG NHAP TAI KHOAN MOI
    // -------------------------------------------------------------------------
    console.log('\n[BUOC 3] Dang nhap vao he thong voi tai khoan moi...');
    if (!page.url().includes('/login') || !(await page.$('#login-email'))) {
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
    }
    await page.waitForSelector('#login-email', { timeout: 10000 });

    await fillInput(page, '#login-email', testEmail);
    await fillInput(page, '#login-password', testPass);

    const ss3 = path.join(SCREENSHOT_DIR, '03_dang_nhap_form.png');
    await page.screenshot({ path: ss3 });
    console.log(`  -> Da chup anh form dang nhap: ${ss3}`);

    console.log('  -> Bam nut Dang nhap...');
    await page.click('#login-submit');
    await page.waitForFunction(() => window.location.pathname === '/', { timeout: 10000 });
    await sleep(2000);

    const ss4 = path.join(SCREENSHOT_DIR, '04_dang_nhap_thanh_cong.png');
    await page.screenshot({ path: ss4 });
    console.log(`  -> Da dang nhap thanh cong va quay ve trang chu: ${ss4}`);

    // -------------------------------------------------------------------------
    // BUOC 4: XEM CHI TIET PHIM VA CHON SUAT CHIEU
    // -------------------------------------------------------------------------
    console.log('\n[BUOC 4] Mo trang chi tiet phim...');
    const moviesFetch = await fetch(`${API_URL}/admin/movies`);
    const moviesData: any = await moviesFetch.json();
    const targetMovie = moviesData.data?.[0];
    if (!targetMovie) throw new Error('Khong tim thay phim.');

    await page.goto(`${BASE_URL}/movie/${targetMovie._id}`, { waitUntil: 'networkidle2' });
    await sleep(2000);

    const ss5 = path.join(SCREENSHOT_DIR, '05_chi_tiet_phim.png');
    await page.screenshot({ path: ss5 });
    console.log(`  -> Da chup anh chi tiet phim: ${ss5}`);

    // Tim suat chieu cua phim
    const showtimesFetch = await fetch(`${API_URL}/admin/showtimes?movie=${targetMovie._id}`);
    const showtimesData: any = await showtimesFetch.json();
    let targetShowtime = showtimesData.data?.[0];
    if (!targetShowtime) {
      const allStFetch = await fetch(`${API_URL}/admin/showtimes`);
      const allStData: any = await allStFetch.json();
      targetShowtime = allStData.data?.[0];
    }
    if (!targetShowtime) throw new Error('Khong tim thay suat chieu.');

    // -------------------------------------------------------------------------
    // BUOC 5: SO DO GHE & CHON GHE (SEAT LOCKING)
    // -------------------------------------------------------------------------
    console.log(`\n[BUOC 5] Chuyen sang man hinh chon ghe: /booking/${targetShowtime._id}`);
    await page.goto(`${BASE_URL}/booking/${targetShowtime._id}`, { waitUntil: 'networkidle2' });
    await sleep(2500);

    console.log('  -> Click chon 2 ghe tren so do ghe...');
    await page.waitForSelector('button[id^="seat-"]:not([disabled])', { timeout: 10000 });
    const availableSeatBtns = await page.$$('button[id^="seat-"]:not([disabled])');
    if (availableSeatBtns.length >= 2) {
      await availableSeatBtns[0].click();
      await sleep(600);
      await availableSeatBtns[1].click();
      await sleep(1500);
    }

    const ss6 = path.join(SCREENSHOT_DIR, '06_da_chon_ghe.png');
    await page.screenshot({ path: ss6 });
    console.log(`  -> Da chup anh so do ghe da chon va bo dem 5 phut: ${ss6}`);

    console.log('  -> Bam nut Tiep tuc thanh toan...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const nextBtn = btns.find((b) => b.textContent?.includes('Tiếp tục thanh toán') || b.textContent?.includes('Thanh toán'));
      if (nextBtn) nextBtn.click();
    });
    await sleep(3000);

    // -------------------------------------------------------------------------
    // BUOC 6: TRANG CHECKOUT (VOUCHER & XAC NHAN THANH TOAN)
    // -------------------------------------------------------------------------
    console.log('\n[BUOC 6] Khach o trang Checkout, nhap voucher giam gia...');
    await sleep(1500);

    const voucherInput = await page.$('#voucher-code-input');
    if (voucherInput) {
      console.log('  -> Nhap ma giam gia CHAOBANMOI va bam Ap dung...');
      await fillInput(page, '#voucher-code-input', 'CHAOBANMOI');
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find((b) => b.textContent?.includes('Áp dụng'));
        if (btn) btn.click();
      });
      await sleep(1500);
    }

    const ss7 = path.join(SCREENSHOT_DIR, '07_trang_checkout.png');
    await page.screenshot({ path: ss7 });
    console.log(`  -> Da chup anh trang Checkout: ${ss7}`);

    console.log('  -> Bam nut Xac nhan thanh toan (Auto QR)...');
    const confirmBtn = await page.$('#btn-confirm-payment');
    if (confirmBtn) {
      await confirmBtn.click();
    } else {
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find((b) => b.textContent?.includes('Auto QR') || b.textContent?.includes('Xác nhận thanh toán'));
        if (btn) btn.click();
      });
    }

    await sleep(3000);

    // -------------------------------------------------------------------------
    // BUOC 7: MODAL VIETQR XUAT HIEN
    // -------------------------------------------------------------------------
    console.log('\n[BUOC 7] Modal Quet Ma QR Thanh Toan (Napas247 SePay) da mo...');
    await page.waitForSelector('.teddy-modal-box', { timeout: 10000 });
    const ss8 = path.join(SCREENSHOT_DIR, '08_modal_vietqr_xuat_hien.png');
    await page.screenshot({ path: ss8 });
    console.log(`  -> Da chup anh Modal VietQR: ${ss8}`);

    // Trich xuat ma don hang FC tu modal
    const orderCode = await page.evaluate(() => {
      const modal = document.querySelector('.teddy-modal-box') || document.body;
      const text = modal.textContent || '';
      const match = text.match(/FC\d+/);
      return match ? match[0] : '';
    });

    console.log(`  -> Ma don hang nhan dien tu man hinh: ${orderCode || 'Dang tim...'}`);

    // -------------------------------------------------------------------------
    // BUOC 8: KICH HOAT THANH TOAN VA DOI MODAL CHUYEN THANH CONG
    // -------------------------------------------------------------------------
    console.log('\n[BUOC 8] Kich hoat chuyen khoan thanh toan tu dong...');
    if (orderCode) {
      const simRes = await fetch(`${API_URL}/payment/simulate-transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderCode }),
      });
      const simJson: any = await simRes.json();
      console.log(`  -> API Simulate Transfer phan hoi: ${simJson.message || 'Thanh cong'}`);
    } else {
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const simBtn = btns.find((b) => b.textContent?.includes('Mô phỏng'));
        if (simBtn) simBtn.click();
      });
    }

    console.log('  -> Cho Modal polling va tu dong cap nhat trang thai thanh cong...');
    await page.waitForSelector('.teddy-success-box', { timeout: 15000 });
    await sleep(1500);

    const ss9 = path.join(SCREENSHOT_DIR, '09_thanh_toan_thanh_cong_modal.png');
    await page.screenshot({ path: ss9 });
    console.log(`  -> Da chup anh Modal Dat Ve Xem Phim Thanh Cong: ${ss9}`);

    // Bam nut "Xac nhan va Xem ve dien tu"
    console.log('  -> Bam nut Xac nhan va Xem ve dien tu...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const viewBtn = btns.find((b) => b.textContent?.includes('Xem vé điện tử') || b.textContent?.includes('Xác nhận'));
      if (viewBtn) viewBtn.click();
    });
    await sleep(2500);

    // -------------------------------------------------------------------------
    // BUOC 9: TRANG HO SO CA NHAN (PROFILE) XEM VE & MA QR SOAT VE
    // -------------------------------------------------------------------------
    console.log('\n[BUOC 9] Xem trang Ho so ca nhan /profile va ma QR ve dien tu...');
    if (!page.url().includes('/profile')) {
      await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle2' });
    }
    await sleep(2500);

    const ss10 = path.join(SCREENSHOT_DIR, '10_ve_dien_tu_profile.png');
    await page.screenshot({ path: ss10 });
    console.log(`  -> Da chup anh Trang Ho so va Ma QR ve dien tu: ${ss10}`);

    console.log('\n================================================================');
    console.log('   FULL PHYSICAL BROWSER TEST PASSED 100%!                     ');
    console.log(`   Toan bo 10 anh chup da duoc luu tai thu muc:                 `);
    console.log(`   ${SCREENSHOT_DIR}`);
    console.log('================================================================\n');

    console.log('Giu trinh duyet mo them 6 giay de ban truc tiep quan sat tren man hinh may...');
    await sleep(6000);
  } catch (error) {
    console.error('[FAIL] Loi trong qua trinh thao tac trinh duyet:', error);
    const errSs = path.join(SCREENSHOT_DIR, 'error_state.png');
    await page.screenshot({ path: errSs }).catch(() => {});
  } finally {
    await browser.close();
    console.log('Da dong trinh duyet an toan.');
  }
}

runBrowserTest();
