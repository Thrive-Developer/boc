# @beyond-ordinary-cloud/n8n-nodes-wazuh

n8n community node untuk menjalankan Wazuh Manager Active Response command dari workflow n8n.

Package npm:

```text
@beyond-ordinary-cloud/n8n-nodes-wazuh
```

## Fitur

- Credential `Wazuh Manager API`
- Node `Wazuh Manager`
- Operasi `Active Response: Run Command`
- Mendukung agent ID lebih dari satu dengan format comma-separated
- Mendukung command arguments dan alert payload JSON

## Persyaratan

- n8n self-hosted
- Akses ke Wazuh Manager API, biasanya port `55000`
- User Wazuh API yang punya izin menjalankan Active Response

Community node dari npm hanya tersedia untuk n8n self-hosted. Node yang belum verified tidak tersedia langsung di n8n Cloud. Lihat dokumentasi resmi n8n untuk opsi instalasi community nodes: https://docs.n8n.io/integrations/community-nodes/installation/

## Instalasi Di n8n

### Opsi 1: Install Dari UI n8n

Gunakan cara ini jika instance n8n Anda mendukung instalasi community node dari GUI.

1. Buka n8n.
2. Masuk ke `Settings`.
3. Buka `Community Nodes`.
4. Pilih `Install`.
5. Masukkan nama package:

```text
@beyond-ordinary-cloud/n8n-nodes-wazuh
```

6. Konfirmasi instalasi.
7. Restart n8n jika node belum muncul di panel nodes.

### Opsi 2: Install Manual Dengan npm

Gunakan cara ini untuk self-hosted n8n yang tidak memakai installer GUI.

Masuk ke environment tempat n8n berjalan, lalu install package:

```bash
npm install -g @beyond-ordinary-cloud/n8n-nodes-wazuh
```

Setelah itu restart service/container n8n.

### Opsi 3: Docker

Untuk Docker, cara paling stabil adalah membuat custom image yang menginstall community node saat build image.

```dockerfile
FROM n8nio/n8n:latest

USER root
RUN npm install -g @beyond-ordinary-cloud/n8n-nodes-wazuh
USER node
```

Build dan jalankan ulang container n8n dengan image tersebut.

```bash
docker build -t n8n-with-wazuh .
```

## Konfigurasi Credential

1. Di n8n, buka `Credentials`.
2. Buat credential baru dengan tipe `Wazuh Manager API`.
3. Isi field berikut:

| Field | Keterangan |
| --- | --- |
| `Base URL` | URL Wazuh Manager API dengan protocol tanpa port, contoh `https://wazuh.myboc.cloud` atau `http://172.16.12.185` |
| `Port` | Port Wazuh Manager API, default `55000` |
| `Username` | Username Wazuh Manager API |
| `Password` | Password Wazuh Manager API |
| `Allow Unauthorized Certs` | Aktifkan hanya jika Wazuh memakai self-signed certificate atau sertifikat internal |

Saat credential dites di n8n, credential ini melakukan autentikasi ke:

```text
POST <base-url>/security/user/authenticate
```

Test dianggap sukses hanya jika Wazuh mengembalikan JWT token di `data.token`.

Saat workflow berjalan, node mengambil token dengan:

```text
POST <base-url>/security/user/authenticate?raw=true
```

Token JWT dari Wazuh kemudian dipakai untuk request Active Response. Jika autentikasi gagal atau token tidak diterima, credential test akan gagal dan credential tidak boleh dianggap siap digunakan.

## Cara Pakai Di Workflow n8n

1. Buat workflow baru atau buka workflow yang sudah ada.
2. Tambahkan node `Wazuh Manager`.
3. Pilih credential `Wazuh Manager API`.
4. Set `Resource` ke `Active Response`.
5. Set `Operation` ke `Run Command`.
6. Isi parameter command.
7. Jalankan node.

## Parameter Node

| Parameter | Contoh | Keterangan |
| --- | --- | --- |
| `Command` | `!firewall-drop` | Nama Active Response command yang akan dijalankan |
| `Agents` | `001,002,003` | Daftar agent ID, dipisahkan koma. Kosongkan untuk menjalankan command pada semua agent |
| `Arguments` | `1.2.3.4` | Argumen command, dipisahkan koma. Dikirim sebagai `arguments` |
| `Alert Data` | `{"rule":{"id":"100001"}}` | Object JSON yang dikirim sebagai `alert.data` |
| `Wait for Complete` | `false` | Aktifkan untuk mengirim query `wait_for_complete=true` ke Wazuh API |

## Contoh Penggunaan

### Block IP Di Satu Agent

Gunakan parameter berikut:

```text
Command: !firewall-drop
Agents: 001
Arguments: 1.2.3.4
Alert Data: {}
Wait for Complete: false
```

### Jalankan Command Di Beberapa Agent

```text
Command: !firewall-drop
Agents: 001,002,003
Arguments: 1.2.3.4
Alert Data: {"source":"n8n"}
Wait for Complete: false
```

### Custom Active Response Script

```text
Command: custom-script-name
Agents: 001
Arguments: value1,value2
Alert Data: {"source":"n8n","severity":"high"}
Wait for Complete: false
```

## Troubleshooting

### Node Tidak Muncul Di n8n

- Pastikan package sudah terinstall di environment yang sama dengan n8n.
- Restart n8n setelah instalasi.
- Pastikan package name yang dipakai adalah `@beyond-ordinary-cloud/n8n-nodes-wazuh`.
- Untuk Docker, pastikan package diinstall di image/container n8n, bukan hanya di host.

### Credential Test Gagal

- Pastikan `Base URL` memakai format yang benar tanpa port, misalnya `https://wazuh.myboc.cloud` atau `http://172.16.12.185`.
- Pastikan port Wazuh Manager API diisi di field `Port`, default-nya `55000`.
- Pastikan username dan password valid.
- Jika memakai self-signed certificate, aktifkan `Allow Unauthorized Certs`.
- Pastikan n8n bisa mengakses host Wazuh dari network/container tempat n8n berjalan.

### Active Response Gagal

- Pastikan agent ID valid dan agent sedang aktif.
- Pastikan command Active Response tersedia di konfigurasi Wazuh.
- Pastikan user API punya permission yang sesuai.
- Periksa response error dari output node n8n untuk detail dari Wazuh API.

## Development

Install dependency:

```bash
npm install
```

Build:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

Run n8n untuk development lokal:

```bash
npm run dev
```

## Lisensi

MIT
