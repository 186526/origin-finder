import { Address4, Address6 } from "ip-address";

import dns2 = require("dns2");
const { Packet } = dns2;

import Axios from "axios";
import DNS = require("dns2");

import * as udp from "dgram";

export async function getIPDetails(address) {
  let requestURL = new URL("https://ip.186526.xyz/");
  requestURL.pathname += address;
  const request = await Axios.get(requestURL.href, {
    headers: {
      Accept: "application/json",
    },
  });
  return request.data;
}

export function getIPv4(question: dns2.DnsQuestion): boolean | Address4 {
  const name = question.name;
  const arpaAddress =
    name.split(".").reduce((pre: string, cur): string => {
      if (isNaN(Number(cur))) {
        return pre;
      }
      pre += cur + ".";
      return pre;
    }, "") + "in-addr.arpa.";
  try {
    return Address4.fromArpa(arpaAddress);
  } catch (e) {
    return false;
  }
}

export function getIPv6(question: dns2.DnsQuestion): boolean | Address6 {
  const name = question.name;
  const arpaAddress =
    name.split(".").reduce((pre: string, cur): string => {
      if (cur.length !== 1) {
        return pre;
      }
      pre += cur + ".";
      return pre;
    }, "") + "ip6.arpa.";
  try {
    return Address6.fromArpa(arpaAddress);
  } catch (e) {
    return false;
  }
}

export const handler: DNS.DnsHandler = async (
  request: dns2.DnsRequest,
  send,
  _rinfo: udp.RemoteInfo
) => {
  const response = Packet.createResponseFromRequest(request);
  const [question] = request.questions;
  let address,
    addressType,
    name = question.name;

  if (getIPv4(question)) {
    address = getIPv4(question);
    addressType = Packet.TYPE.A;
  }
  if (getIPv6(question)) {
    address = getIPv6(question);
    addressType = Packet.TYPE.AAAA;
  }
  if (![Packet.TYPE.AAAA, Packet.TYPE.A].includes(addressType)) {
    return;
  }

  //@ts-ignore
  if ([Packet.TYPE.AAAA, Packet.TYPE.A].includes(question.type)) {
    response.answers.push({
      name: name,
      type: addressType,
      class: Packet.CLASS.IN,
      ttl: 114514,
      address: address.address,
    });
  }

  //@ts-ignore
  if ([Packet.TYPE.TXT].includes(question.type)) {
    const details = await getIPDetails(address.address);
    response.answers.push({
      name: name,
      type: Packet.TYPE.TXT,
      class: Packet.CLASS.IN,
      ttl: 600,
      //@ts-expect-error
      data: `${
        details.asn.number > 4200000000
          ? String(details.asn.number).slice(-5)
          : details.asn.number
      } | ${details.route ?? address.addressMinusSuffix + address.subnet} | ${
        (details.country ?? { code: "IDK" }).code ?? "IDK"
      } | ${details.from} | IDK`,
    });
  }

  //@ts-ignore
  if ([Packet.TYPE.NS].includes(question.type)) {
    //@ts-ignore
    response.authorities.push({
      name: name,
      type: Packet.TYPE.NS,
      class: Packet.CLASS.IN,
      ttl: 114514,
      ns: "ns-origin.186526.dn42.",
    });
  }

  //@ts-ignore
  if ([Packet.TYPE.SOA].includes(question.type)) {
    //@ts-ignore
    response.additionals.push({
      name: name,
      type: Packet.TYPE.SOA,
      class: Packet.CLASS.IN,
      ttl: 114514,
      //@ts-ignore
      primary: "ns-origin.186526.dn42.",
      admin: "i@186526.xyz",
      serial: 1145141919,
      refresh: 100,
      retry: 3,
      expiration: 10,
      minimum: 10,
    });
  }

  console.log(response.answers);

  send(response);
  return;
};
