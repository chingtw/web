import { UI } from './modules/ui.js';
import { getPackageData, submitReturnForm } from './modules/api.js';
import { resizeParent, getCurrentDateTime } from './modules/utils.js';

document.addEventListener('DOMContentLoaded', () => {
    // Initialize UI
    UI.init();

    // --- Logic for Section 3: Shipment Return ---

    // 1. Search Logic
    const searchBtn = document.getElementById('search-btn');
    const searchInput = document.getElementById('search-name');

    // Allow Enter key to search
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent form submit if inside form
            if (searchInput.value.trim()) triggerSearch();
        }
    });

    searchBtn.addEventListener('click', triggerSearch);

  async function triggerSearch() {
        const name = searchInput.value.trim();
        if (!name) {
            Swal.fire('請輸入名稱', '查詢欄位不能為空', 'warning');
            return;
        }

        UI.showLoading();
        try {
            // 0.關閉欄位
            document.getElementById('search-result-area').classList.add('hidden');
            document.getElementById('return-form-details').classList.add('hidden');
            // 1. 呼叫 API
            const data = await getPackageData(name);
            
            // --- 除錯重點：印出 API 回傳的內容 ---
            console.log("STEP 1: API 回傳資料成功", data);
            
            UI.hideLoading();

            // 2. 檢查資料是否為空
            // 注意：這裡多加了 Array.isArray(data) 檢查，防止回傳物件導致 length 報錯
            if (!data || (Array.isArray(data) && data.length === 0)) {
                Swal.fire('查無資料', '請確認名稱是否正確', 'info');
                document.getElementById('search-result-area').classList.add('hidden');
                document.getElementById('return-form-details').classList.add('hidden');
                return;
            }

            // 3. 嘗試渲染 UI
            // 很多時候 API 成功了，但資料格式跟 UI 要的不一樣，導致這裡報錯
            console.log("STEP 2: 準備渲染 UI");
            document.getElementById('search-result-area').classList.remove('hidden');
            
            // 確保 UI.renderPackageList 存在且不會報錯
            if (typeof UI.renderPackageList === 'function') {
                UI.renderPackageList(data, fillReturnForm);
            } else {
                throw new Error("UI.renderPackageList 函式不存在");
            }

        } catch (error) {
            UI.hideLoading();
            document.getElementById('search-result-area').classList.add('hidden');
            document.getElementById('return-form-details').classList.add('hidden');
            // --- 除錯重點：印出真正的錯誤原因 ---
            console.error("❌ 搜尋流程崩潰:", error);
            
            // 提示使用者
            Swal.fire('發生錯誤', '細節請看 F12 Console', 'error');
        }
    }

    // 2. Fill Form Logic
    function fillReturnForm(pkgData) {
        // pkgData: [Time, Name, Note, Platform, Product, ?, Money, Type, Status]
        // Legacy mapping:
        // ar[4] -> inputid1 (Product)
        // ar[7] -> inputid3 (Type: Order/Pre-order)
        // ar[3] -> inputid2 (Platform) - disabled if exists
        // ar[6] -> inputid4 (Money) - disabled if exists

        const formDetails = document.getElementById('return-form-details');
        formDetails.classList.remove('hidden');

        // Auto-scroll to details
        formDetails.scrollIntoView({ behavior: 'smooth' });

        document.getElementById('input-product').value = pkgData[4];
        document.getElementById('input-type').value = pkgData[7];

        const platformInput = document.getElementById('input-platform');
        const moneyInput = document.getElementById('input-money');

        if (pkgData[2] === "") { // No special note implies user needs to fill
             platformInput.value = "";
             platformInput.disabled = false;
             moneyInput.value = "";
             moneyInput.disabled = false;
        } else {
             platformInput.value = pkgData[3];
             platformInput.disabled = true;
             moneyInput.value = pkgData[6];
             moneyInput.disabled = true;
        }

        // Reset other fields
        document.getElementById('input-date').value = "";
        document.getElementById('input-delivery-company').value = "";
        document.getElementById('input-delivery-no').value = "";

        // Resize parent
        resizeParent();
    }

    // 3. Select Change Logic (Delivery & Notice)
    document.getElementById('select-delivery').addEventListener('change', (e) => {
        const val = e.target.value;
        const input = document.getElementById('input-delivery-company');
        if (val === '其他') {
            input.value = "";
            input.placeholder = "請輸入宅配物流公司名稱";
            input.focus();
        } else if (val === '0') {
             input.value = "";
        } else {
            input.value = val;
        }
    });

    document.getElementById('select-notice').addEventListener('change', (e) => {
        const val = e.target.value;
        const input = document.getElementById('input-notice');
        if (val === '其他') {
            input.value = "";
            input.placeholder = "請輸入特殊注意項目";
            input.focus();
        } else if (val === '0') {
            input.value = "";
        } else {
            input.value = val;
        }
    });

    // 4. Submit Logic
    document.getElementById('btn-submit-return').addEventListener('click', async () => {
        const name = searchInput.value.trim();
        const type = document.getElementById('input-type').value;
        const product = document.getElementById('input-product').value;
        const platform = document.getElementById('input-platform').value;
        const money = document.getElementById('input-money').value;
        const urgent = document.querySelector('input[name="urgent"]:checked').value;
        const date = document.getElementById('input-date').value;
        const delivery = document.getElementById('input-delivery-company').value;
        const deliveryCode = document.getElementById('input-delivery-no').value;
        const notice = document.getElementById('input-notice').value;

        // Validation
        if (!date || !delivery || !deliveryCode || !notice || !platform || !money) {
            Swal.fire('資料不完整', '請填寫所有必填欄位', 'warning');
            return;
        }

        const formData = {
            "order_time": getCurrentDateTime(),
            "order_name": name,
            "order_way": type,
            "order_commodity": product,
            "order_platform": platform,
            "order_money": money,
            "order_urgent": urgent,
            "order_notice": notice,
            "order_shippingdate": date,
            "order_delivery": delivery,
            "order_deliverycode": deliveryCode
        };

        UI.showLoading();
        try {
            const result = await submitReturnForm(formData);
            UI.hideLoading();
            console.log("Submit 回傳結果:", result);
            if (result && result.includes("成功")) {
                Swal.fire({
                    title: '資料回填成功!',
                    text: '貨到倉或寄回台灣時會再通知~',
                    imageUrl: 'images/ok.gif',
                    imageWidth: 200,
                    imageHeight: 150,
                    backdrop: `rgba(0,0,123,0.4) url("./images/nyan-cat.gif") left top no-repeat`
                }).then(() => {     
                    // Refresh search to update list
                     triggerSearch();
                });
            } else {
                document.getElementById('search-result-area').classList.add('hidden');
                document.getElementById('return-form-details').classList.add('hidden');
                throw new Error("Backend returned error");
            }
        } catch (error) {
             UI.hideLoading();
             Swal.fire('發生錯誤', '提交失敗，請聯繫管理員', 'error');
        }
    });

    // 5. Reset/Go Back
    document.getElementById('btn-reset').addEventListener('click', () => {
         document.getElementById('return-form-details').classList.add('hidden');
         // Scroll back to top of form
         document.getElementById('section-return').scrollIntoView({ behavior: 'smooth' });
    });

    // --- Global Resize Observer ---
    // Watch for size changes to constantly update iframe height
    const resizeObserver = new ResizeObserver(() => {
        resizeParent();
    });
    resizeObserver.observe(document.body);
});
