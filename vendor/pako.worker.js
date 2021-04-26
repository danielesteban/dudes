importScripts('https://cdn.jsdelivr.net/npm/pako@2.0.3/dist/pako.min.js');

self.addEventListener('message', ({ data: { id, data, operation } }) => {
  data = pako[operation](data);
  self.postMessage({ id, data }, [data.buffer]);
});
