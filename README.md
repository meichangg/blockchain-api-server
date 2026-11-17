# Bài 3: Thực hành Node.js Express với Blockchain

## Cấu trúc
```
blockchain-api-server/
├── server.ts                  # entry: import './src/app'
├── src/
│   ├── app.ts                 # Express app, middleware, health check, 404
│   ├── data/
│   │   ├── networks.ts        # danh sách network, map CoinGecko/Alchemy
│   │   ├── types.ts           # các interface response
│   │   └── parser.ts          # parse assetId (CAIP + dạng đơn giản), đổi đơn vị
│   ├── provider/
│   │   ├── alchemy.ts         # EVM: balance, gas, history, token/NFT
│   │   ├── coingecko.ts       # giá, lịch sử giá
│   │   └── bitcoin.ts         # Blockstream API
│   ├── service/blockchain.service.ts
│   ├── controller/blockchain.controller.ts
│   └── router/blockchain.router.ts
├── postman_collection.json    # import vào Postman để test mục 5
├── GETH_LOCAL.md              # phần nâng cao
├── .env / .env.example
├── tsconfig.json
└── package.json
```

## Chạy
1. Điền key vào `.env`:
   ```
   COINGECKO_API_KEY=CG-xxxxxxxx
   ALCHEMY_API_KEY=xxxxxxxx
   ```
   Trong Alchemy Dashboard → app của bạn → **Networks**: bật **Ethereum Mainnet** và **Base Mainnet** (bài test dùng cả hai). Nếu chỉ bật Sepolia thì các API ethereum/base sẽ báo lỗi.
2. `npm install`
3. `npm run build`
4. `npm start` → `Blockchain API Server is running on http://localhost:3000`

   (Hoặc `npm run dev` để chạy thẳng file TypeScript, không cần build)

## Test (mục 5)
Postman → **Import** → chọn `postman_collection.json` → chuột phải vào collection → **Run collection**.

| Nhóm | Endpoint |
|---|---|
| Health | `GET /` |
| Price | `GET /api/price/bitcoin`, `/api/price/ethereum`, CAIP: `/api/price/bip122%3A000000000019d6689c085ae165831e93%2Fslip44%3A0`, ERC20: `/api/price/eip155%3A8453%2Ferc20%3A0x4200…0006` |
| Balance | `GET /api/balance/1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa/bitcoin`, `/api/balance/0x742d…d8b6/ethereum`, ERC20 trên Base |
| Gas | `GET /api/gas/ethereum?type=eip1559`, `?type=legacy` |
| Token metadata | `GET /api/token/metadata/bitcoin`, `/ethereum`, ERC20 WETH trên Base |
| NFT | `GET /api/nft/owned/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045/ethereum` |

Lưu ý: dấu `:` và `/` trong assetId dạng CAIP phải được URL-encode (`%3A`, `%2F`).

## Các chỗ đã sửa so với code trong tài liệu
| File | Vấn đề | Cách sửa |
|---|---|---|
| `types.ts` | `bitcoin.ts` trả về `status: 'pending'` nhưng kiểu dữ liệu chỉ cho phép `'success' \| 'failed'`, nên `tsc` báo lỗi | Thêm `'pending'` |
| `networks.ts` | Tài liệu đặt tên file là `network.ts`, nhưng mọi file khác đều import `./networks` | Đặt tên là `networks.ts` |
| `alchemy.ts` | `alchemy_getOwnersForToken`, `alchemy_getNFTMetadata`, `alchemy_getContractMetadata` không phải phương thức JSON-RPC | Chuyển sang NFT REST API v3 (`getOwnersForNFT`, `getNFTMetadata`, `getContractMetadata`); `getOwnersForCollection` → `getOwnersForContract` |
| `alchemy.ts` | History: `weiToEther(transfer.value)` bị lỗi vì `value` là số thập phân (ví dụ `0.5`); `pageKey: "page_2"` không hợp lệ | Dùng `rawContract.value` cho giá trị gốc, `maxCount` dạng hex |
| `coingecko.ts` | `interval=hourly` chỉ có ở gói trả phí nên CoinGecko báo lỗi | `days <= 1` thì bỏ tham số interval |
| `app.ts` | Health check trả về message khác với expected response | Đổi thành `DominionDAO Blockchain API Server` |
| `tsconfig.json` | `lib` đặt ngoài `compilerOptions` nên không có tác dụng | Chuyển vào trong `compilerOptions` |
| `.env` | Nếu để nguyên giá trị mẫu `your_..._api_key` thì request bị gửi với key sai | Giá trị mẫu được coi như chưa có key; CoinGecko khi đó dùng public API |
