// lib/pi/wallet.js
import * as StellarSdk from "@stellar/stellar-sdk";

const NETWORK = process.env.PI_NETWORK_ENV === "mainnet" ? "mainnet" : "testnet";

const HORIZON_URL =
  NETWORK === "mainnet"
    ? "https://api.mainnet.minepi.com"
    : "https://api.testnet.minepi.com";

const NETWORK_PASSPHRASE = NETWORK === "mainnet" ? "Pi Network" : "Pi Testnet";

let cachedServer = null;
function getServer() {
  if (!cachedServer) {
    cachedServer = new StellarSdk.Horizon.Server(HORIZON_URL);
  }
  return cachedServer;
}

/**
 * يبني ويوقّع ويرسل معاملة دفع فعلية على بلوكتشين Pi (App-to-User)
 * @param {string} paymentIdentifier - معرّف الدفعة من Pi Platform API (يُحفظ كـ memo إلزامياً)
 * @param {string} recipientAddress - عنوان محفظة المستلم
 * @param {number} amount - المبلغ بعملة Pi
 * @returns {Promise<string>} txid - معرّف المعاملة على البلوكتشين
 */
export async function submitA2UPayment({ paymentIdentifier, recipientAddress, amount }) {
  const privateSeed = process.env.PI_WALLET_PRIVATE_SEED;
  if (!privateSeed) {
    throw new Error("PI_WALLET_PRIVATE_SEED غير معرّف في متغيرات البيئة");
  }
  if (!paymentIdentifier || !recipientAddress || !amount) {
    throw new Error("submitA2UPayment: بيانات ناقصة (paymentIdentifier/recipientAddress/amount)");
  }

  const server = getServer();
  const keypair = StellarSdk.Keypair.fromSecret(privateSeed);
  const sourcePublicKey = keypair.publicKey();

  // نتحقق دائماً من الحساب الفعلي على البلوكتشين قبل الإرسال (توصية Pi الرسمية)
  const account = await server.loadAccount(sourcePublicKey);
  const baseFee = await server.fetchBaseFee();

  const transaction = new StellarSdk.TransactionBuilder(account, {
    fee: baseFee.toString(),
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: recipientAddress,
        asset: StellarSdk.Asset.native(),
        amount: amount.toString(),
      })
    )
    // إلزامي: تضمين معرّف الدفعة كـ memo حتى يربطه Pi Network بالدفعة الصحيحة
    .addMemo(StellarSdk.Memo.text(paymentIdentifier))
    .setTimeout(180)
    .build();

  transaction.sign(keypair);

  const result = await server.submitTransaction(transaction);
  return result.hash;
}
