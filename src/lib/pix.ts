// Gera o código "Pix copia e cola" (BR Code estático, padrão EMV do Banco Central).

export const PIX_KEY = "37998598753";
const PIX_KEY_EMV = "+5537998598753"; // chave de telefone no formato exigido pelo Pix
const MERCHANT_NAME = "SABRINE BEAUTY"; // até 25 caracteres
const MERCHANT_CITY = "S ANTONIO MONTE"; // até 15 caracteres

function field(id: string, value: string) {
  return `${id}${String(value.length).padStart(2, "0")}${value}`;
}

function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Código Pix copia e cola com o valor já preenchido. */
export function pixCopiaECola(amountCents: number, txid = "SITE") {
  const merchantAccount = field("00", "br.gov.bcb.pix") + field("01", PIX_KEY_EMV);
  const safeTxid = txid.replace(/[^A-Za-z0-9]/g, "").slice(0, 25) || "***";
  const payload =
    field("00", "01") +
    field("26", merchantAccount) +
    field("52", "0000") +
    field("53", "986") +
    (amountCents > 0 ? field("54", (amountCents / 100).toFixed(2)) : "") +
    field("58", "BR") +
    field("59", MERCHANT_NAME) +
    field("60", MERCHANT_CITY) +
    field("62", field("05", safeTxid)) +
    "6304";
  return payload + crc16(payload);
}

/** Imagem do QR Code (gerada a partir do código copia e cola). */
export function pixQrImageUrl(code: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=10&data=${encodeURIComponent(code)}`;
}
