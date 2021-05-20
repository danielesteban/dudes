importScripts('/fflate.js');

self.addEventListener('message', ({ data: { id, data, operation } }) => {
  data = fflate[`${operation}Sync`](data);
  self.postMessage({ id, data }, [data.buffer]);
});
