import { Address4, Address6 } from "ip-address";

import dns2 = require("dns2");
const { Packet } = dns2;

import Axios from "axios";

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

export function getIPv4(question: {
  name: string;
  type: number;
  class: number;
}): boolean | Address4 {
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

export function getIPv6(question: {
  name: string;
  type: number;
  class: number;
}): boolean | Address6 {
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

export default async function handler(
  request: any,
  send: (response: any) => undefined,
  _rinfo: any
) {
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

  if ([Packet.TYPE.AAAA, Packet.TYPE.A].includes(question.type)) {
    response.answers.push({
      name: name,
      type: addressType,
      class: Packet.CLASS.IN,
      ttl: 114514,
      address: address.address,
    });
  }

  if ([Packet.TYPE.TXT].includes(question.type)) {
    const details = await getIPDetails(address.address);
    response.answers.push({
      name: name,
      type: Packet.TYPE.TXT,
      class: Packet.CLASS.IN,
      ttl: 114514,
      data: `${
        details.asn.number > 4200000000
          ? String(details.asn.number).slice(-5)
          : details.asn.number
      } | ${details.route ?? address.addressMinusSuffix + address.subnet} | ${
        (details.country ?? { code: "IDK" }).code ?? "IDK"
      } | ${details.from} | IDK`,
    });
  }

  console.log(response.answers);

  send(response);
}
