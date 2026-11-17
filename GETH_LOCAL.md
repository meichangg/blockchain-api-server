# Phần nâng cao: chạy Geth local (PoS) và cho server gọi vào node local

Kể từ The Merge, Ethereum chạy bằng **Proof of Stake**. Một node gồm 2 thành phần:

| Thành phần | Phần mềm | Vai trò |
|---|---|---|
| Execution client | **Geth** | Thực thi giao dịch, lưu state, mở JSON-RPC `:8545` (server của ta gọi vào đây) |
| Consensus client | Prysm / Lighthouse… | Chạy PoS: chọn validator, đề xuất và xác nhận block |

Hai client nói chuyện với nhau qua **Engine API** (`:8551`), được xác thực bằng file `jwt.hex`.

Dưới đây có 2 cách. Cách A nhanh, đủ để demo. Cách B là mạng PoS thật đầy đủ.

---

## Cách A: `geth --dev` (PoS mô phỏng, nhanh nhất)

Từ Geth 1.13 trở đi, chế độ `--dev` chạy **sau Merge**: Geth tự nhúng một beacon giả lập (simulated beacon) để sinh block theo cơ chế PoS, không còn dùng Clique/PoW. Đây là cách đơn giản nhất để có một chain PoS local.

1. Tải Geth cho Windows: https://geth.ethereum.org/downloads (bản *Geth & Tools*), giải nén rồi thêm thư mục vào `PATH`.
   Kiểm tra: `geth version`

2. Chạy node (PowerShell):
   ```powershell
   geth --dev --dev.period 5 --datadir .\gethdev `
        --http --http.addr 127.0.0.1 --http.port 8545 `
        --http.api eth,net,web3,txpool,debug `
        --http.corsdomain "*"
   ```
   * `--dev.period 5`: cứ 5 giây sinh 1 block, kể cả khi không có giao dịch
   * Tài khoản dev được nạp sẵn rất nhiều ETH. Địa chỉ in ra ở dòng log `Using developer account address=0x...`

3. Lấy địa chỉ dev account (mở terminal khác):
   ```powershell
   geth attach http://127.0.0.1:8545
   > eth.accounts
   > eth.getBalance(eth.accounts[0])
   > eth.blockNumber
   ```

4. Trong `.env` của server: `LOCAL_RPC_URL=http://127.0.0.1:8545`, rồi `npm run build && npm start`.

5. Test bằng Postman (thư mục **g. (Nang cao) Local Geth** trong collection; đổi biến `localAddress` thành dev account):
   * `GET http://localhost:3000/api/gas/local`
   * `GET http://localhost:3000/api/balance/<dev_account>/local`
   * `GET http://localhost:3000/api/token/metadata/local`
   * CAIP cũng được: `eip155:1337/slip44:60` (dev chain có chainId = 1337)

   Các request này đi thẳng tới node của bạn, không qua Alchemy nên **không cần API key**.

---

## Cách B: Mạng PoS đầy đủ (Geth + Prysm beacon + validator)

Cách dễ nhất là dùng repo mẫu của Prysm, chạy bằng Docker Desktop:

```powershell
git clone https://github.com/OffchainLabs/eth-pos-devnet.git
cd eth-pos-devnet
.\clean.bat          # hoặc: docker compose down -v, rồi xoá consensus/beacondata, execution/geth
docker compose up -d
docker compose logs -f geth
```

Repo này dựng 5 service:
1. `create-beacon-chain-genesis` (prysmctl): tạo genesis cho cả consensus layer và execution layer
2. `geth-genesis`: `geth init` với `genesis.json`
3. `beacon-chain` (Prysm): kết nối Geth qua `http://geth:8551` + `jwtsecret`
4. `validator` (Prysm): 64 validator interop, đảm nhận việc đề xuất và attest block
5. `geth`: mở RPC tại `http://localhost:8545`, chainId **32382**

Kiểm tra PoS đang chạy:
* `curl http://localhost:3500/eth/v1/beacon/headers/head` → slot tăng dần
* `geth attach http://localhost:8545` → `eth.blockNumber` tăng khoảng 12 giây một lần

Sau đó giữ `LOCAL_RPC_URL=http://127.0.0.1:8545` và test y như cách A. ethers tự nhận chainId 32382. Tài khoản có sẵn ETH trong genesis là `0x123463a4B065722E99115D6c222f267d9cABb524` (xem `execution/genesis.json`).

---

## Code đã thêm vào dự án để hỗ trợ node local

* `src/data/networks.ts`: thêm network `local` (RPC lấy từ `LOCAL_RPC_URL`) và `sepolia`
* `src/data/parser.ts`: map `eip155:1337` → `local`, `eip155:11155111` → `sepolia`
* `src/provider/alchemy.ts` → `getProvider('local')` dùng thẳng `LOCAL_RPC_URL`, bỏ qua kiểm tra Alchemy API key
