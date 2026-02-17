import log from "electron-log";
import fetch from "node-fetch";
import { createTypedHandler } from "./base";
import { systemContracts } from "../types/system";
import { URL } from "url";
import dns from "dns";
import util from "util";

const lookup = util.promisify(dns.lookup);
const logger = log.scope("upload_handlers");

function isPrivateIP(ip: string): boolean {
  // IPv4 check
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = ip.match(ipv4Regex);

  if (match) {
    const parts = match.slice(1).map(Number);
    // 127.0.0.0/8 (Loopback)
    if (parts[0] === 127) return true;
    // 10.0.0.0/8
    if (parts[0] === 10) return true;
    // 172.16.0.0/12
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 169.254.0.0/16 (Link-local)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 0.0.0.0/8 (This network)
    if (parts[0] === 0) return true;
    return false;
  }

  // IPv6 check
  // Simple check for loopback and unique local addresses
  if (ip === "::1" || ip === "::") return true;
  if (ip.toLowerCase().startsWith("fc") || ip.toLowerCase().startsWith("fd"))
    return true; // Unique local
  if (ip.toLowerCase().startsWith("fe80")) return true; // Link-local

  // Check for IPv4 mapped IPv6 addresses ::ffff:127.0.0.1
  if (ip.toLowerCase().startsWith("::ffff:")) {
    const v4 = ip.substring(7);
    return isPrivateIP(v4);
  }

  return false;
}

export function registerUploadHandlers() {
  createTypedHandler(systemContracts.uploadToSignedUrl, async (_, params) => {
    const { url, contentType, data } = params;
    logger.debug("IPC: upload-to-signed-url called");

    // Validate the signed URL
    if (!url || typeof url !== "string" || !url.startsWith("https://")) {
      throw new Error("Invalid signed URL provided");
    }

    try {
      const parsedUrl = new URL(url);
      let hostname = parsedUrl.hostname;

      // Remove brackets from IPv6 literal if present
      if (hostname.startsWith("[") && hostname.endsWith("]")) {
        hostname = hostname.slice(1, -1);
      }

      // Resolve the hostname to an IP address
      const { address } = await lookup(hostname);

      if (isPrivateIP(address)) {
        throw new Error(
          "Invalid upload URL: Private or local IP addresses are not allowed.",
        );
      }
    } catch (e: any) {
      if (
        e.message ===
        "Invalid upload URL: Private or local IP addresses are not allowed."
      ) {
        throw e;
      }
      // If DNS lookup fails or URL is invalid, treat as invalid URL
      // But logging the specific error is helpful for debugging
      logger.warn(`URL validation failed for ${url}: ${e.message}`);
      throw new Error("Invalid URL or hostname resolution failed");
    }

    // Validate content type
    if (!contentType || typeof contentType !== "string") {
      throw new Error("Invalid content type provided");
    }

    // Perform the upload to the signed URL
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(
        `Upload failed with status ${response.status}: ${response.statusText}`,
      );
    }

    logger.debug("Successfully uploaded data to signed URL");
  });

  logger.debug("Registered upload IPC handlers");
}
