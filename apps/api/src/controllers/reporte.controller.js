

const svc = require("../services/reporte.service");

async function arqueoSemanal(req, reply) {
  return reply.send(await svc.arqueoSemanal(req.server, Number(req.query.semana), req.user));
}

async function panelGeneral(req, reply) {
  return reply.send(await svc.panelGeneral(req.server, req.query, req.user));
}

async function cobrosPorEntregador(req, reply) {
  return reply.send(
    await svc.cobrosPorEntregador(req.server, req.query, req.user),
  );
}

async function corteCaja(req, reply) {
  return reply.send(await svc.corteCaja(req.server, req.query, req.user));
}

module.exports = { arqueoSemanal, panelGeneral, cobrosPorEntregador, corteCaja };
