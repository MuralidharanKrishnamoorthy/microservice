import pythonApi from './pythonApi';

// Records are owned by python-service (port 8000).
export async function listRecords() {
  const { data } = await pythonApi.get('/api/records');
  return data.data;
}

export async function createRecord(record) {
  const { data } = await pythonApi.post('/api/records', record);
  return data.data;
}

export async function updateRecord(id, record) {
  const { data } = await pythonApi.put(`/api/records/${id}`, record);
  return data.data;
}

export async function deleteRecord(id) {
  await pythonApi.delete(`/api/records/${id}`);
}
