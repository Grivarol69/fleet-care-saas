if (!self.define) {
  let e,
    c = {};
  const s = (s, a) => (
    (s = new URL(s + '.js', a).href),
    c[s] ||
      new Promise(c => {
        if ('document' in self) {
          const e = document.createElement('script');
          ((e.src = s), (e.onload = c), document.head.appendChild(e));
        } else ((e = s), importScripts(s), c());
      }).then(() => {
        let e = c[s];
        if (!e) throw new Error(`Module ${s} didn’t register its module`);
        return e;
      })
  );
  self.define = (a, i) => {
    const n =
      e ||
      ('document' in self ? document.currentScript.src : '') ||
      location.href;
    if (c[n]) return;
    let t = {};
    const r = e => s(e, n),
      d = { module: { uri: n }, exports: t, require: r };
    c[n] = Promise.all(a.map(e => d[e] || r(e))).then(e => (i(...e), t));
  };
}
define(['./workbox-3c9d0171'], function (e) {
  'use strict';
  (importScripts('/fallback-ce627215c0e4a9af.js'),
    self.skipWaiting(),
    e.clientsClaim(),
    e.precacheAndRoute(
      [
        {
          url: '/Factura de Compra 2.pdf',
          revision: 'dfd423d59e4c67b784f6a6a6ffc7474b',
        },
        {
          url: '/Factura de compra 1.pdf',
          revision: 'e6d1093952c250982477fc7730852a0e',
        },
        {
          url: '/_next/static/3MOqisSvX9N3olx4ITLHP/_buildManifest.js',
          revision: '16b790dcc92de2c491cd6b5efd0df874',
        },
        {
          url: '/_next/static/3MOqisSvX9N3olx4ITLHP/_ssgManifest.js',
          revision: 'b6652df95db52feb4daf4eca35380933',
        },
        {
          url: '/_next/static/chunks/1029.2f5932d8a4aa1258.js',
          revision: '2f5932d8a4aa1258',
        },
        {
          url: '/_next/static/chunks/1031-0042b22a49297b54.js',
          revision: '0042b22a49297b54',
        },
        {
          url: '/_next/static/chunks/1052-643b51ca75d5ffb4.js',
          revision: '643b51ca75d5ffb4',
        },
        {
          url: '/_next/static/chunks/1065.042c10450bc0f017.js',
          revision: '042c10450bc0f017',
        },
        {
          url: '/_next/static/chunks/1088-2cd5cf7ee59945cf.js',
          revision: '2cd5cf7ee59945cf',
        },
        {
          url: '/_next/static/chunks/1295-b0b9b07366c1dcb2.js',
          revision: 'b0b9b07366c1dcb2',
        },
        {
          url: '/_next/static/chunks/1394-3e18a70876a67629.js',
          revision: '3e18a70876a67629',
        },
        {
          url: '/_next/static/chunks/1568-8215852d7bcc2d42.js',
          revision: '8215852d7bcc2d42',
        },
        {
          url: '/_next/static/chunks/1757-e7bdfe61647bf49d.js',
          revision: 'e7bdfe61647bf49d',
        },
        {
          url: '/_next/static/chunks/1807-c9b71f4b95264fcc.js',
          revision: 'c9b71f4b95264fcc',
        },
        {
          url: '/_next/static/chunks/210f6791-af6001471764a4c3.js',
          revision: 'af6001471764a4c3',
        },
        {
          url: '/_next/static/chunks/2190-d710d9d51adcac93.js',
          revision: 'd710d9d51adcac93',
        },
        {
          url: '/_next/static/chunks/2337-bd73fd731e347f9f.js',
          revision: 'bd73fd731e347f9f',
        },
        {
          url: '/_next/static/chunks/2413-7d6e876c07d8445d.js',
          revision: '7d6e876c07d8445d',
        },
        {
          url: '/_next/static/chunks/2535-63950f9802d85af8.js',
          revision: '63950f9802d85af8',
        },
        {
          url: '/_next/static/chunks/2674-a616c9107ec3b02b.js',
          revision: 'a616c9107ec3b02b',
        },
        {
          url: '/_next/static/chunks/2885.b379c450c804cc2f.js',
          revision: 'b379c450c804cc2f',
        },
        {
          url: '/_next/static/chunks/3363-67296f3973f9e9e2.js',
          revision: '67296f3973f9e9e2',
        },
        {
          url: '/_next/static/chunks/3536-c4e76033b884a96b.js',
          revision: 'c4e76033b884a96b',
        },
        {
          url: '/_next/static/chunks/3876-f4977efdf7f6bcb7.js',
          revision: 'f4977efdf7f6bcb7',
        },
        {
          url: '/_next/static/chunks/3911-0c23a3d2a3dbb9ec.js',
          revision: '0c23a3d2a3dbb9ec',
        },
        {
          url: '/_next/static/chunks/4522-174c39addce35998.js',
          revision: '174c39addce35998',
        },
        {
          url: '/_next/static/chunks/4530-76e14a7fdc97d34b.js',
          revision: '76e14a7fdc97d34b',
        },
        {
          url: '/_next/static/chunks/4541-7d049cf990042dbc.js',
          revision: '7d049cf990042dbc',
        },
        {
          url: '/_next/static/chunks/47-0ae3cddc0b653c55.js',
          revision: '0ae3cddc0b653c55',
        },
        {
          url: '/_next/static/chunks/4706-11258663a1c05674.js',
          revision: '11258663a1c05674',
        },
        {
          url: '/_next/static/chunks/4770-2f29a573dc6a008f.js',
          revision: '2f29a573dc6a008f',
        },
        {
          url: '/_next/static/chunks/4771-b67f937ebaa5024d.js',
          revision: 'b67f937ebaa5024d',
        },
        {
          url: '/_next/static/chunks/4900-39fac5fff17a126f.js',
          revision: '39fac5fff17a126f',
        },
        {
          url: '/_next/static/chunks/4913-c0ac3509e7becc62.js',
          revision: 'c0ac3509e7becc62',
        },
        {
          url: '/_next/static/chunks/4977-6b26d4ea1498bebf.js',
          revision: '6b26d4ea1498bebf',
        },
        {
          url: '/_next/static/chunks/5203-207d8337c2e9060b.js',
          revision: '207d8337c2e9060b',
        },
        {
          url: '/_next/static/chunks/5227-36de14bfcd820501.js',
          revision: '36de14bfcd820501',
        },
        {
          url: '/_next/static/chunks/536-ac1ff636208525c5.js',
          revision: 'ac1ff636208525c5',
        },
        {
          url: '/_next/static/chunks/5681-a25dd66622508b9c.js',
          revision: 'a25dd66622508b9c',
        },
        {
          url: '/_next/static/chunks/5777-af69153b73cae3dd.js',
          revision: 'af69153b73cae3dd',
        },
        {
          url: '/_next/static/chunks/6104-cbc878186ddd1711.js',
          revision: 'cbc878186ddd1711',
        },
        {
          url: '/_next/static/chunks/6447-a296e48f212a6399.js',
          revision: 'a296e48f212a6399',
        },
        {
          url: '/_next/static/chunks/6617-ceac96e4a98b651b.js',
          revision: 'ceac96e4a98b651b',
        },
        {
          url: '/_next/static/chunks/7166-bf05a3f41c5a2a1d.js',
          revision: 'bf05a3f41c5a2a1d',
        },
        {
          url: '/_next/static/chunks/7341-dc679cde87c78ac8.js',
          revision: 'dc679cde87c78ac8',
        },
        {
          url: '/_next/static/chunks/7418-7d9d4aa5c241d898.js',
          revision: '7d9d4aa5c241d898',
        },
        {
          url: '/_next/static/chunks/77-2fbc5d299b0d71a2.js',
          revision: '2fbc5d299b0d71a2',
        },
        {
          url: '/_next/static/chunks/78115154-bed612eb3dec3476.js',
          revision: 'bed612eb3dec3476',
        },
        {
          url: '/_next/static/chunks/8006-9846b873df0b000e.js',
          revision: '9846b873df0b000e',
        },
        {
          url: '/_next/static/chunks/8600-1c7258c3b18c9b6c.js',
          revision: '1c7258c3b18c9b6c',
        },
        {
          url: '/_next/static/chunks/8790-294d87610646930a.js',
          revision: '294d87610646930a',
        },
        {
          url: '/_next/static/chunks/8b521253-d197030c68687fa8.js',
          revision: 'd197030c68687fa8',
        },
        {
          url: '/_next/static/chunks/903-41741011afd5f75a.js',
          revision: '41741011afd5f75a',
        },
        {
          url: '/_next/static/chunks/9130-1cc5295718836346.js',
          revision: '1cc5295718836346',
        },
        {
          url: '/_next/static/chunks/9453-05ff1435530a23c8.js',
          revision: '05ff1435530a23c8',
        },
        {
          url: '/_next/static/chunks/9480-35bce2a4a622ea3e.js',
          revision: '35bce2a4a622ea3e',
        },
        {
          url: '/_next/static/chunks/9592-0451cc6fe003ee8b.js',
          revision: '0451cc6fe003ee8b',
        },
        {
          url: '/_next/static/chunks/9693-5f0dadd02c817af1.js',
          revision: '5f0dadd02c817af1',
        },
        {
          url: '/_next/static/chunks/9709-0d8c00761f665f8e.js',
          revision: '0d8c00761f665f8e',
        },
        {
          url: '/_next/static/chunks/9725-b7a2e3ca98d6a4cf.js',
          revision: 'b7a2e3ca98d6a4cf',
        },
        {
          url: '/_next/static/chunks/9733-879a013e4924e33f.js',
          revision: '879a013e4924e33f',
        },
        {
          url: '/_next/static/chunks/9872-60c9244afd93ddae.js',
          revision: '60c9244afd93ddae',
        },
        {
          url: '/_next/static/chunks/9997-ff044ac1700ce61a.js',
          revision: 'ff044ac1700ce61a',
        },
        {
          url: '/_next/static/chunks/app/(dashboard)/admin/kb-population/page-4b9be1f14ff145f8.js',
          revision: '4b9be1f14ff145f8',
        },
        {
          url: '/_next/static/chunks/app/(driver)/checklist/%5Bindex%5D/page-8ff31fd357b6c62e.js',
          revision: '8ff31fd357b6c62e',
        },
        {
          url: '/_next/static/chunks/app/(driver)/checklist/page-af585d347ce229c3.js',
          revision: 'af585d347ce229c3',
        },
        {
          url: '/_next/static/chunks/app/(driver)/checklist/success/page-1cc893d7a35590b7.js',
          revision: '1cc893d7a35590b7',
        },
        {
          url: '/_next/static/chunks/app/(driver)/checklist/summary/page-6cfea4d39eb1e455.js',
          revision: '6cfea4d39eb1e455',
        },
        {
          url: '/_next/static/chunks/app/(driver)/history/page-02b4488125ce8c7f.js',
          revision: '02b4488125ce8c7f',
        },
        {
          url: '/_next/static/chunks/app/(driver)/home/page-7a994e7eb101f89d.js',
          revision: '7a994e7eb101f89d',
        },
        {
          url: '/_next/static/chunks/app/(driver)/incidents/new/page-075f7fc917e9c33c.js',
          revision: '075f7fc917e9c33c',
        },
        {
          url: '/_next/static/chunks/app/(driver)/layout-99a9ff3218d85ba5.js',
          revision: '99a9ff3218d85ba5',
        },
        {
          url: '/_next/static/chunks/app/_global-error/page-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/_not-found/page-5434731405b6ebbd.js',
          revision: '5434731405b6ebbd',
        },
        {
          url: '/_next/static/chunks/app/admin/layout-7a994e7eb101f89d.js',
          revision: '7a994e7eb101f89d',
        },
        {
          url: '/_next/static/chunks/app/admin/page-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/admin/settings/page-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/admin/templates/page-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/admin/tenants/page-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/admin/audit-log/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/admin/kb/import/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/admin/kb/save/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/admin/users/%5BuserId%5D/role/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/admin/users/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/alerts/test/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/analytics/fuel/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/auth/me/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/cost-centers/%5Bid%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/cost-centers/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/dashboard/financial-evolution/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/dashboard/financial-metrics/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/dashboard/fleet-status/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/dashboard/navbar-stats/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/driver/me/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/financial/alerts/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/financial/watchdog/test/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/fuel/vouchers/%5Bid%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/fuel/vouchers/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/hseq/checklists/%5Bid%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/hseq/checklists/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/hseq/checklists/template/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/hseq/checklists/templates/%5Bid%5D/clone/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/hseq/checklists/templates/%5Bid%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/hseq/checklists/templates/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/hseq/incidents/%5Bid%5D/promote-to-wo/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/hseq/incidents/%5Bid%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/hseq/incidents/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/integrations/siigo/bootstrap/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/integrations/siigo/config/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/integrations/siigo/sync/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/integrations/siigo/test-connection/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/internal-tickets/%5Bid%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/internal-tickets/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/inventory/adjustments/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/inventory/consume/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/inventory/items/%5Bid%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/inventory/items/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/inventory/movements/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/inventory/parts/%5Bid%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/inventory/parts/recommendations/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/inventory/parts/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/inventory/purchases/%5Bid%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/inventory/purchases/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/invoices/%5Bid%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/invoices/recent/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/invoices/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/alerts/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/expenses/%5Bid%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/invoices/%5Bid%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/invoices/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/mant-categories/%5Bid%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/mant-categories/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/mant-item-requests/%5Bid%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/mant-item-requests/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/mant-items/%5Bid%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/mant-items/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/mant-items/search/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/mant-items/similar/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/mant-package/clone/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/mant-template/%5Bid%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/mant-template/clone/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/mant-template/global/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/mant-template/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/package-items/%5Bid%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/package-items/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/packages/%5Bid%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/packages/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/schedule/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/tempario-items/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/tempario/%5Bid%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/tempario/%5Bid%5D/steps/%5BstepId%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/tempario/%5Bid%5D/steps/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/tempario/lookup/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/tempario/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/vehicle-parts/%5Bid%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/vehicle-parts/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/vehicle-parts/suggest/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/vehicle-programs/%5Bid%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/vehicle-programs/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/vehicles/%5Bid%5D/recipes/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/work-orders/%5Bid%5D/expenses/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/work-orders/%5Bid%5D/import-recipe/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/work-orders/%5Bid%5D/items/%5BitemId%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/work-orders/%5Bid%5D/items/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/work-orders/%5Bid%5D/purchase-orders/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/work-orders/%5Bid%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/work-orders/%5Bid%5D/subtasks/%5BsubTaskId%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/work-orders/%5Bid%5D/subtasks/expand/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/work-orders/%5Bid%5D/subtasks/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/work-orders/%5Bid%5D/workshop-tickets/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/maintenance/work-orders/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/people/drivers/%5Bid%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/people/drivers/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/people/providers/%5Bid%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/people/providers/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/people/technicians/%5Bid%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/people/technicians/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/purchase-orders/%5Bid%5D/items/%5BitemId%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/purchase-orders/%5Bid%5D/items/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/purchase-orders/%5Bid%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/purchase-orders/%5Bid%5D/send-email/route-31855cb0b98a9899.js',
          revision: '31855cb0b98a9899',
        },
        {
          url: '/_next/static/chunks/app/api/purchase-orders/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/reports/fleet-status/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/reports/maintenance-costs/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/serialized-items/%5Bid%5D/assign/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/serialized-items/%5Bid%5D/events/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/serialized-items/%5Bid%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/serialized-items/%5Bid%5D/unassign/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/serialized-items/alerts/%5Bid%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/serialized-items/alerts/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/serialized-items/bulk/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/serialized-items/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/serialized-items/vehicles-summary/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/tenants/%5Bid%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/tenants/current/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/tenants/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/tenants/slug/%5Bslug%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/uploadthing/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/vehicles/brands/%5Bid%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/vehicles/brands/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/vehicles/document-types/%5Bid%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/vehicles/document-types/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/vehicles/documents/%5Bid%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/vehicles/documents/expiring/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/vehicles/documents/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/vehicles/lines/%5Bid%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/vehicles/lines/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/vehicles/odometer/%5Bid%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/vehicles/odometer/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/vehicles/send-cv/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/vehicles/types/%5Bid%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/vehicles/types/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/vehicles/vehicles/%5Bid%5D/cv-download/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/vehicles/vehicles/%5Bid%5D/maintenance-history/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/vehicles/vehicles/%5Bid%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/vehicles/vehicles/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/watchdog-config/%5Bid%5D/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/watchdog-config/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/api/webhooks/clerk/route-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/dashboard/admin/audit-log/page-88e0d9f06bdf13a8.js',
          revision: '88e0d9f06bdf13a8',
        },
        {
          url: '/_next/static/chunks/app/dashboard/admin/document-types/page-789d392e96925a10.js',
          revision: '789d392e96925a10',
        },
        {
          url: '/_next/static/chunks/app/dashboard/admin/permissions/page-7a994e7eb101f89d.js',
          revision: '7a994e7eb101f89d',
        },
        {
          url: '/_next/static/chunks/app/dashboard/admin/roles/page-7a994e7eb101f89d.js',
          revision: '7a994e7eb101f89d',
        },
        {
          url: '/_next/static/chunks/app/dashboard/admin/tenant/page-7a994e7eb101f89d.js',
          revision: '7a994e7eb101f89d',
        },
        {
          url: '/_next/static/chunks/app/dashboard/admin/users/page-9f37b7c925b0e5a9.js',
          revision: '9f37b7c925b0e5a9',
        },
        {
          url: '/_next/static/chunks/app/dashboard/admin/watchdog/page-fa21209b4891838c.js',
          revision: 'fa21209b4891838c',
        },
        {
          url: '/_next/static/chunks/app/dashboard/assets/page-336e167261cae3c8.js',
          revision: '336e167261cae3c8',
        },
        {
          url: '/_next/static/chunks/app/dashboard/cost-centers/page-416b3f43b1aef8b7.js',
          revision: '416b3f43b1aef8b7',
        },
        {
          url: '/_next/static/chunks/app/dashboard/empresa/configuracion/page-7a994e7eb101f89d.js',
          revision: '7a994e7eb101f89d',
        },
        {
          url: '/_next/static/chunks/app/dashboard/empresa/informacion/page-7a994e7eb101f89d.js',
          revision: '7a994e7eb101f89d',
        },
        {
          url: '/_next/static/chunks/app/dashboard/empresa/integraciones/siigo/page-d14fdc06f7a5a92e.js',
          revision: 'd14fdc06f7a5a92e',
        },
        {
          url: '/_next/static/chunks/app/dashboard/empresa/sucursales/page-7a994e7eb101f89d.js',
          revision: '7a994e7eb101f89d',
        },
        {
          url: '/_next/static/chunks/app/dashboard/error-2396038cfab115b4.js',
          revision: '2396038cfab115b4',
        },
        {
          url: '/_next/static/chunks/app/dashboard/fuel/vouchers/page-525218ee4809fbfa.js',
          revision: '525218ee4809fbfa',
        },
        {
          url: '/_next/static/chunks/app/dashboard/hseq/checklists/page-a6b1117c198c9a97.js',
          revision: 'a6b1117c198c9a97',
        },
        {
          url: '/_next/static/chunks/app/dashboard/hseq/incidents/page-e00dabf1a1edaf38.js',
          revision: 'e00dabf1a1edaf38',
        },
        {
          url: '/_next/static/chunks/app/dashboard/hseq/templates/page-0c5f5a0b6ceaa4f9.js',
          revision: '0c5f5a0b6ceaa4f9',
        },
        {
          url: '/_next/static/chunks/app/dashboard/inventory/parts/page-0b94127f49267795.js',
          revision: '0b94127f49267795',
        },
        {
          url: '/_next/static/chunks/app/dashboard/inventory/purchases/%5Bid%5D/page-2f04aaa2c383ec19.js',
          revision: '2f04aaa2c383ec19',
        },
        {
          url: '/_next/static/chunks/app/dashboard/inventory/purchases/new/page-a093f8019397b5e5.js',
          revision: 'a093f8019397b5e5',
        },
        {
          url: '/_next/static/chunks/app/dashboard/inventory/purchases/page-d4eaa6b6d9775301.js',
          revision: 'd4eaa6b6d9775301',
        },
        {
          url: '/_next/static/chunks/app/dashboard/inventory/stock/page-4eac982603c022a5.js',
          revision: '4eac982603c022a5',
        },
        {
          url: '/_next/static/chunks/app/dashboard/invoices/%5Bid%5D/page-cc78f2093272d83a.js',
          revision: 'cc78f2093272d83a',
        },
        {
          url: '/_next/static/chunks/app/dashboard/invoices/%5Bid%5D/print/page-a4bd933f3803aa4b.js',
          revision: 'a4bd933f3803aa4b',
        },
        {
          url: '/_next/static/chunks/app/dashboard/invoices/new/page-83499abfb5efd89e.js',
          revision: '83499abfb5efd89e',
        },
        {
          url: '/_next/static/chunks/app/dashboard/invoices/page-bbb56cfa9c070358.js',
          revision: 'bbb56cfa9c070358',
        },
        {
          url: '/_next/static/chunks/app/dashboard/layout-d83067e02aead9fb.js',
          revision: 'd83067e02aead9fb',
        },
        {
          url: '/_next/static/chunks/app/dashboard/maintenance/alerts/page-3b38ef3ab65acace.js',
          revision: '3b38ef3ab65acace',
        },
        {
          url: '/_next/static/chunks/app/dashboard/maintenance/mant-categories/page-71d7434df9a5ade2.js',
          revision: '71d7434df9a5ade2',
        },
        {
          url: '/_next/static/chunks/app/dashboard/maintenance/mant-items/page-094c40242b2135c7.js',
          revision: '094c40242b2135c7',
        },
        {
          url: '/_next/static/chunks/app/dashboard/maintenance/mant-template/page-d1d1d7e23ec8517d.js',
          revision: 'd1d1d7e23ec8517d',
        },
        {
          url: '/_next/static/chunks/app/dashboard/maintenance/mis-planes/page-0375cede4ff33673.js',
          revision: '0375cede4ff33673',
        },
        {
          url: '/_next/static/chunks/app/dashboard/maintenance/planes-globales/page-0988305a37c9ed7b.js',
          revision: '0988305a37c9ed7b',
        },
        {
          url: '/_next/static/chunks/app/dashboard/maintenance/taller/page-a5d19d0b71d46550.js',
          revision: 'a5d19d0b71d46550',
        },
        {
          url: '/_next/static/chunks/app/dashboard/maintenance/tempario/page-e79010cde4185f3b.js',
          revision: 'e79010cde4185f3b',
        },
        {
          url: '/_next/static/chunks/app/dashboard/maintenance/vehicle-parts/page-c430eed3a853f8c3.js',
          revision: 'c430eed3a853f8c3',
        },
        {
          url: '/_next/static/chunks/app/dashboard/maintenance/vehicle-programs/page-c224d417c97044bb.js',
          revision: 'c224d417c97044bb',
        },
        {
          url: '/_next/static/chunks/app/dashboard/maintenance/work-orders/%5Bid%5D/page-b7593969d3f2b4cb.js',
          revision: 'b7593969d3f2b4cb',
        },
        {
          url: '/_next/static/chunks/app/dashboard/maintenance/work-orders/new/page-2a6a00066d39e324.js',
          revision: '2a6a00066d39e324',
        },
        {
          url: '/_next/static/chunks/app/dashboard/maintenance/work-orders/page-f85e58ba84b8b1e5.js',
          revision: 'f85e58ba84b8b1e5',
        },
        {
          url: '/_next/static/chunks/app/dashboard/not-found-7a994e7eb101f89d.js',
          revision: '7a994e7eb101f89d',
        },
        {
          url: '/_next/static/chunks/app/dashboard/page-c9a807b64a0bf61b.js',
          revision: 'c9a807b64a0bf61b',
        },
        {
          url: '/_next/static/chunks/app/dashboard/people/driver/page-93548941cd3ac291.js',
          revision: '93548941cd3ac291',
        },
        {
          url: '/_next/static/chunks/app/dashboard/people/provider/page-4fbdb1e00a273ee0.js',
          revision: '4fbdb1e00a273ee0',
        },
        {
          url: '/_next/static/chunks/app/dashboard/people/technician/page-2bafc1b04264f00f.js',
          revision: '2bafc1b04264f00f',
        },
        {
          url: '/_next/static/chunks/app/dashboard/purchase-orders/%5Bid%5D/page-2d01d6096cec0de1.js',
          revision: '2d01d6096cec0de1',
        },
        {
          url: '/_next/static/chunks/app/dashboard/purchase-orders/page-13fd924f46110d40.js',
          revision: '13fd924f46110d40',
        },
        {
          url: '/_next/static/chunks/app/dashboard/reports/fleet-status/page-7ffcae489fcaa50e.js',
          revision: '7ffcae489fcaa50e',
        },
        {
          url: '/_next/static/chunks/app/dashboard/reports/fuel-analytics/page-bf538bdc5bbe1d50.js',
          revision: 'bf538bdc5bbe1d50',
        },
        {
          url: '/_next/static/chunks/app/dashboard/reports/maintenance-costs/page-e3cef8fbf5100330.js',
          revision: 'e3cef8fbf5100330',
        },
        {
          url: '/_next/static/chunks/app/dashboard/reports/maintenance-efficiency/page-7a994e7eb101f89d.js',
          revision: '7a994e7eb101f89d',
        },
        {
          url: '/_next/static/chunks/app/dashboard/vehicles/brands/page-82dc6430ddf79729.js',
          revision: '82dc6430ddf79729',
        },
        {
          url: '/_next/static/chunks/app/dashboard/vehicles/documents/page-7cfdf286eeeea164.js',
          revision: '7cfdf286eeeea164',
        },
        {
          url: '/_next/static/chunks/app/dashboard/vehicles/fleet/new/page-729f4efa099e038c.js',
          revision: '729f4efa099e038c',
        },
        {
          url: '/_next/static/chunks/app/dashboard/vehicles/fleet/page-73e0c774a62dbda8.js',
          revision: '73e0c774a62dbda8',
        },
        {
          url: '/_next/static/chunks/app/dashboard/vehicles/lines/page-2f205587b66b6185.js',
          revision: '2f205587b66b6185',
        },
        {
          url: '/_next/static/chunks/app/dashboard/vehicles/odometer/page-a66eab9171cee661.js',
          revision: 'a66eab9171cee661',
        },
        {
          url: '/_next/static/chunks/app/dashboard/vehicles/types/page-00c977e54eb9e7c0.js',
          revision: '00c977e54eb9e7c0',
        },
        {
          url: '/_next/static/chunks/app/layout-54d1dc84d5d95724.js',
          revision: '54d1dc84d5d95724',
        },
        {
          url: '/_next/static/chunks/app/onboarding/page-f523f5c2afe5fbcf.js',
          revision: 'f523f5c2afe5fbcf',
        },
        {
          url: '/_next/static/chunks/app/page-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/sign-in/%5B%5B...sign-in%5D%5D/page-018fcbbf31c06e7c.js',
          revision: '018fcbbf31c06e7c',
        },
        {
          url: '/_next/static/chunks/app/sign-up/%5B%5B...sign-up%5D%5D/page-018fcbbf31c06e7c.js',
          revision: '018fcbbf31c06e7c',
        },
        {
          url: '/_next/static/chunks/app/tenant/layout-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/app/tenant/onboarding/page-2c8f3bd400583e8d.js',
          revision: '2c8f3bd400583e8d',
        },
        {
          url: '/_next/static/chunks/app/tenant/page-f7820051451c818e.js',
          revision: 'f7820051451c818e',
        },
        {
          url: '/_next/static/chunks/cbbc2011-be4bf4a4d145a018.js',
          revision: 'be4bf4a4d145a018',
        },
        {
          url: '/_next/static/chunks/dab2510c-93e18f97f91dcf35.js',
          revision: '93e18f97f91dcf35',
        },
        {
          url: '/_next/static/chunks/ddd2adbf-9dbf5273a8755707.js',
          revision: '9dbf5273a8755707',
        },
        {
          url: '/_next/static/chunks/e0fafeb2.8f759395f8d0ef10.js',
          revision: '8f759395f8d0ef10',
        },
        {
          url: '/_next/static/chunks/f42681cc-b3b8161c9f9fc66f.js',
          revision: 'b3b8161c9f9fc66f',
        },
        {
          url: '/_next/static/chunks/framework-f66bc3802b4be890.js',
          revision: 'f66bc3802b4be890',
        },
        {
          url: '/_next/static/chunks/main-73a05922ef58898b.js',
          revision: '73a05922ef58898b',
        },
        {
          url: '/_next/static/chunks/main-app-0fb4ad1f4041ab9f.js',
          revision: '0fb4ad1f4041ab9f',
        },
        {
          url: '/_next/static/chunks/next/dist/client/components/builtin/app-error-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/next/dist/client/components/builtin/forbidden-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/next/dist/client/components/builtin/global-error-a6bd7042dab28c96.js',
          revision: 'a6bd7042dab28c96',
        },
        {
          url: '/_next/static/chunks/next/dist/client/components/builtin/not-found-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/next/dist/client/components/builtin/unauthorized-46d56cfc01eb9396.js',
          revision: '46d56cfc01eb9396',
        },
        {
          url: '/_next/static/chunks/polyfills-42372ed130431b0a.js',
          revision: '846118c33b2c0e922d7b3a7676f81f6f',
        },
        {
          url: '/_next/static/chunks/webpack-7af247be0662a5d2.js',
          revision: '7af247be0662a5d2',
        },
        {
          url: '/_next/static/css/2e6327d52e00b6ce.css',
          revision: '2e6327d52e00b6ce',
        },
        {
          url: '/_next/static/css/de70bee13400563f.css',
          revision: 'de70bee13400563f',
        },
        {
          url: '/_next/static/media/4cf2300e9c8272f7-s.p.woff2',
          revision: '18bae71b1e1b2bb25321090a3b563103',
        },
        {
          url: '/_next/static/media/747892c23ea88013-s.woff2',
          revision: 'a0761690ccf4441ace5cec893b82d4ab',
        },
        {
          url: '/_next/static/media/8d697b304b401681-s.woff2',
          revision: 'cc728f6c0adb04da0dfcb0fc436a8ae5',
        },
        {
          url: '/_next/static/media/93f479601ee12b01-s.p.woff2',
          revision: 'da83d5f06d825c5ae65b7cca706cb312',
        },
        {
          url: '/_next/static/media/9610d9e46709d722-s.woff2',
          revision: '7b7c0ef93df188a852344fc272fc096b',
        },
        {
          url: '/_next/static/media/ba015fad6dcf6784-s.woff2',
          revision: '8ea4f719af3312a055caf09f34c89a77',
        },
        {
          url: '/detalle anterior documentos.png',
          revision: '4f5ddd4028cfabdfae569de7a533bee4',
        },
        { url: '/driver/home', revision: '3MOqisSvX9N3olx4ITLHP' },
        {
          url: '/fallback-ce627215c0e4a9af.js',
          revision: '1f1f804a8aa22834ced559ba38bba144',
        },
        { url: '/file.svg', revision: 'd09f95206c3fa0bb9bd9fefabfd0ea71' },
        { url: '/globe.svg', revision: '2aaafa6a49b6563925fe440891e32717' },
        {
          url: '/icons/driver-192.png',
          revision: 'ad67c112feafec47fe4ba37b5a366013',
        },
        {
          url: '/icons/driver-512.png',
          revision: '450b8b2f6960c472a0e491c0e3df4ed6',
        },
        {
          url: '/icons/driver-icon.svg',
          revision: '26864bf65ad3687b090f8a6b8851bce1',
        },
        {
          url: '/images/audi_quattro.jpeg',
          revision: '42b05b6845a6584ed93706273fa098aa',
        },
        {
          url: '/images/chevrolet_colorado.jpg',
          revision: 'c0943e22f261d71b56e61956e2df1ef1',
        },
        {
          url: '/images/chevrolet_cyz.jpg',
          revision: '2a8fd8db95fe9ecd7ef1174134467bea',
        },
        {
          url: '/images/chevrolet_dmax.jpg',
          revision: 'f4cc1d27fe0e2c1b86edb71e8035e903',
        },
        {
          url: '/images/chevrolet_dmax_1.jpg',
          revision: '2c5d06a1f366ba17c44768515eb895ea',
        },
        {
          url: '/images/chevrolet_dmax_2.jpg',
          revision: 'da2cc75db3902ef3519c19c87068a2c4',
        },
        {
          url: '/images/dongfeng_rich6.jpg',
          revision: '8ce36f44c6f10eb250d763dd16d632e2',
        },
        {
          url: '/images/dongfeng_rich6_pagina_web.jpg',
          revision: '943d80a37531931cc9a84e2ef8ca1813',
        },
        {
          url: '/images/dongfeng_rich6_pagina_web_1.jpg',
          revision: '8d2c43d35e2b8f706f54a2ef74f66342',
        },
        {
          url: '/images/excavadora.jpg',
          revision: 'e9ce3d74eec9ec37a43300c82e0178ad',
        },
        {
          url: '/images/fondo_yevimaquinas.jpg',
          revision: 'e0a5c9d6cbf074dc515e41433c09c310',
        },
        {
          url: '/images/ford-ranger-1.jpg',
          revision: 'ce5be139bcb9314a121d4fd5b4fade1c',
        },
        {
          url: '/images/ford_ranger.jpg',
          revision: 'c37edc7b628c5fb2e9bea0d39a910af9',
        },
        {
          url: '/images/franger.jpeg',
          revision: 'c3cd53f9b3fb9af13b4cd1b75cee132a',
        },
        {
          url: '/images/franger24.jpeg',
          revision: 'dac1f5ff9ace73f8b19906f161d0227b',
        },
        {
          url: '/images/frangers-1.png',
          revision: '99b67b723f4d97f94c186ec99512f778',
        },
        {
          url: '/images/frangers.jpg',
          revision: '302a482477210eefea9c38b8de71378c',
        },
        {
          url: '/images/hilux.jpg',
          revision: 'cdfc020254c0edf31716affd91f8a1cb',
        },
        {
          url: '/images/mitsubishi-l200.jpg',
          revision: '37236d93edaa65c2ab92f525858bca4b',
        },
        {
          url: '/images/nissan frontier.jpg',
          revision: '4190011c0be1a405668010ffe6f089af',
        },
        {
          url: '/images/oroch.jpg',
          revision: '896ec8ee528bad4440b531c55e2b6d2f',
        },
        {
          url: '/images/persona1.jpg',
          revision: 'c4601754a8c6024d884e4b994e525b2a',
        },
        {
          url: '/images/persona2.jpg',
          revision: '3cbd25fd7d33687c363a7ebc03428df8',
        },
        {
          url: '/images/persona3.jpg',
          revision: '91f33a804e67fc8c4fc6b760660ed28a',
        },
        {
          url: '/images/reducidas/audi_quattro.jpeg',
          revision: '42b05b6845a6584ed93706273fa098aa',
        },
        {
          url: '/images/reducidas/chevrolet_colorado.jpg',
          revision: 'c0943e22f261d71b56e61956e2df1ef1',
        },
        {
          url: '/images/reducidas/chevrolet_cyz.jpg',
          revision: '2a8fd8db95fe9ecd7ef1174134467bea',
        },
        {
          url: '/images/reducidas/compressed/frangers.jpg',
          revision: '07ec92665f52f61dbb7d7fa8ec0f752f',
        },
        {
          url: '/images/reducidas/compressed/hilux.jpg',
          revision: 'cdfc020254c0edf31716affd91f8a1cb',
        },
        {
          url: '/images/reducidas/frangers.jpg',
          revision: 'd50c6d5641ecba582faf2a8948cfc57d',
        },
        {
          url: '/images/reducidas/hilux.jpg',
          revision: '0cda925895e28cad0567faf135e512ed',
        },
        {
          url: '/images/reducidas/iloveimg-compressed.zip',
          revision: '5ee7e005fdbdd3f7c2f6f5a69fffd085',
        },
        {
          url: '/images/reducidas/volqueta1.jpg',
          revision: '763d53094308143c5448f7beeec66e3c',
        },
        {
          url: '/images/renault-duster-roja.jpg',
          revision: '371f1d8d668fe836eae2e2f9ff6d570a',
        },
        {
          url: '/images/volqueta.jpg',
          revision: '147047bb9a21b2cfcb5bd268ee0277f0',
        },
        {
          url: '/images/volqueta1.jpg',
          revision: '763d53094308143c5448f7beeec66e3c',
        },
        {
          url: '/images/volvo_c40.jpeg',
          revision: 'eb376cd96b50732f80b6c74d20e96e24',
        },
        {
          url: '/images/volvo_c40_white.jpg',
          revision: 'beaf171455df917a1c228630bf23c0f3',
        },
        {
          url: '/images/yevimaquinas.png',
          revision: 'b43271e419721dde53d79f505de37778',
        },
        { url: '/logo.svg', revision: 'a9525290b3ab404ba27b9a1ccb76e2e8' },
        { url: '/manifest.json', revision: '5655b578870346088772321ad1dffa82' },
        { url: '/next copy.svg', revision: '8e061864f388b47f33a1c3780831193e' },
        { url: '/next.svg', revision: '8e061864f388b47f33a1c3780831193e' },
        {
          url: '/swe-worker-5c72df51bb1f6ee0.js',
          revision: '76fdd3369f623a3edcf74ce2200bfdd0',
        },
        {
          url: '/vercel copy.svg',
          revision: '61c6b19abff40ea7acd577be818f3976',
        },
        { url: '/vercel.svg', revision: 'c0af2f507b369b085b35ef4bbe3bcf1e' },
        { url: '/window.svg', revision: 'a2760511c65806022ad20adf74370ff3' },
        {
          url: '/yevimaquinas.svg',
          revision: '7ab9ad26d7bfde16054b894f293d7788',
        },
      ],
      { ignoreURLParametersMatching: [/^utm_/, /^fbclid$/] }
    ),
    e.cleanupOutdatedCaches(),
    e.registerRoute(
      '/',
      new e.NetworkFirst({
        cacheName: 'start-url',
        plugins: [
          {
            cacheWillUpdate: async ({ response: e }) =>
              e && 'opaqueredirect' === e.type
                ? new Response(e.body, {
                    status: 200,
                    statusText: 'OK',
                    headers: e.headers,
                  })
                : e,
          },
          {
            handlerDidError: async ({ request: e }) =>
              'undefined' != typeof self ? self.fallback(e) : Response.error(),
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:gstatic)\.com\/.*/i,
      new e.CacheFirst({
        cacheName: 'google-fonts-webfonts',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 31536e3 }),
          {
            handlerDidError: async ({ request: e }) =>
              'undefined' != typeof self ? self.fallback(e) : Response.error(),
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /^https:\/\/fonts\.(?:googleapis)\.com\/.*/i,
      new e.StaleWhileRevalidate({
        cacheName: 'google-fonts-stylesheets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
          {
            handlerDidError: async ({ request: e }) =>
              'undefined' != typeof self ? self.fallback(e) : Response.error(),
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:eot|otf|ttc|ttf|woff|woff2|font.css)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-font-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 604800 }),
          {
            handlerDidError: async ({ request: e }) =>
              'undefined' != typeof self ? self.fallback(e) : Response.error(),
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-image-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 2592e3 }),
          {
            handlerDidError: async ({ request: e }) =>
              'undefined' != typeof self ? self.fallback(e) : Response.error(),
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\/_next\/static.+\.js$/i,
      new e.CacheFirst({
        cacheName: 'next-static-js-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
          {
            handlerDidError: async ({ request: e }) =>
              'undefined' != typeof self ? self.fallback(e) : Response.error(),
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\/_next\/image\?url=.+$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'next-image',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 86400 }),
          {
            handlerDidError: async ({ request: e }) =>
              'undefined' != typeof self ? self.fallback(e) : Response.error(),
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:mp3|wav|ogg)$/i,
      new e.CacheFirst({
        cacheName: 'static-audio-assets',
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          {
            handlerDidError: async ({ request: e }) =>
              'undefined' != typeof self ? self.fallback(e) : Response.error(),
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:mp4|webm)$/i,
      new e.CacheFirst({
        cacheName: 'static-video-assets',
        plugins: [
          new e.RangeRequestsPlugin(),
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          {
            handlerDidError: async ({ request: e }) =>
              'undefined' != typeof self ? self.fallback(e) : Response.error(),
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:js)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-js-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 48, maxAgeSeconds: 86400 }),
          {
            handlerDidError: async ({ request: e }) =>
              'undefined' != typeof self ? self.fallback(e) : Response.error(),
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:css|less)$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'static-style-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          {
            handlerDidError: async ({ request: e }) =>
              'undefined' != typeof self ? self.fallback(e) : Response.error(),
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\/_next\/data\/.+\/.+\.json$/i,
      new e.StaleWhileRevalidate({
        cacheName: 'next-data',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          {
            handlerDidError: async ({ request: e }) =>
              'undefined' != typeof self ? self.fallback(e) : Response.error(),
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      /\.(?:json|xml|csv)$/i,
      new e.NetworkFirst({
        cacheName: 'static-data-assets',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          {
            handlerDidError: async ({ request: e }) =>
              'undefined' != typeof self ? self.fallback(e) : Response.error(),
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      ({ sameOrigin: e, url: { pathname: c } }) =>
        !(!e || c.startsWith('/api/auth/callback') || !c.startsWith('/api/')),
      new e.NetworkFirst({
        cacheName: 'apis',
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 16, maxAgeSeconds: 86400 }),
          {
            handlerDidError: async ({ request: e }) =>
              'undefined' != typeof self ? self.fallback(e) : Response.error(),
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      ({ request: e, url: { pathname: c }, sameOrigin: s }) =>
        '1' === e.headers.get('RSC') &&
        '1' === e.headers.get('Next-Router-Prefetch') &&
        s &&
        !c.startsWith('/api/'),
      new e.NetworkFirst({
        cacheName: 'pages-rsc-prefetch',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          {
            handlerDidError: async ({ request: e }) =>
              'undefined' != typeof self ? self.fallback(e) : Response.error(),
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      ({ request: e, url: { pathname: c }, sameOrigin: s }) =>
        '1' === e.headers.get('RSC') && s && !c.startsWith('/api/'),
      new e.NetworkFirst({
        cacheName: 'pages-rsc',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          {
            handlerDidError: async ({ request: e }) =>
              'undefined' != typeof self ? self.fallback(e) : Response.error(),
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      ({ url: { pathname: e }, sameOrigin: c }) => c && !e.startsWith('/api/'),
      new e.NetworkFirst({
        cacheName: 'pages',
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 86400 }),
          {
            handlerDidError: async ({ request: e }) =>
              'undefined' != typeof self ? self.fallback(e) : Response.error(),
          },
        ],
      }),
      'GET'
    ),
    e.registerRoute(
      ({ sameOrigin: e }) => !e,
      new e.NetworkFirst({
        cacheName: 'cross-origin',
        networkTimeoutSeconds: 10,
        plugins: [
          new e.ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 3600 }),
          {
            handlerDidError: async ({ request: e }) =>
              'undefined' != typeof self ? self.fallback(e) : Response.error(),
          },
        ],
      }),
      'GET'
    ));
});
