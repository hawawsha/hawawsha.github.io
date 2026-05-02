// lib/piRpc.js
const RPC_URL = process.env.RPC_URL || 'https://rpc.testnet.minepi.com';

async function rpcCall(method, params) {
  const body = { jsonrpc: '2.0', id: 1, method };
  if (params !== undefined) body.params = params;

  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.result;
}

export async function getHealth() {
  return await rpcCall('getHealth');
}

export async function getBalance(address) {
  const result = await rpcCall('getBalance', [address]);
  if (result === null || result === undefined) return '0';
  return (Number(result) / 10000000).toFixed(7);
}

export async function getTransaction(txHash) {
  return await rpcCall('getTransaction', [txHash]);
}

export async function getAccountInfo(address) {
  return await rpcCall('getAccountInfo', [address]);
}
