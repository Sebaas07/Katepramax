

const svc = require("../services/reporte.service");

async function arqueoSemanal(req, reply) {
  return reply.send(await svc.arqueoSemanal(req.server, Number(req.query.semana), req.user));
}

async function panelGeneral(req, reply) {
  return reply.send(await svc.panelGeneral(req.server, req.query, req.user));
}

async function historialSemanal(req, reply) {
  return reply.send(
    await svc.historialSemanal(req.server, {
      skip: Number(req.query.skip ?? 0),
      take: Number(req.query.take ?? 20),
    }, req.user),
  );
}

async function cobrosPorEntregador(req, reply) {
  return reply.send(
    await svc.cobrosPorEntregador(req.server, req.query, req.user),
  );
}

async function corteCaja(req, reply) {
  return reply.send(await svc.corteCaja(req.server, req.query, req.user));
}

module.exports = { arqueoSemanal, panelGeneral, historialSemanal, cobrosPorEntregador, corteCaja };
