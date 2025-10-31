import { deflateRawSync } from "node:zlib"

interface ZipEntry {
  path: string
  data: string
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let crc = i
    for (let j = 0; j < 8; j++) {
      if ((crc & 1) !== 0) {
        crc = (crc >>> 1) ^ 0xedb88320
      } else {
        crc >>>= 1
      }
    }
    table[i] = crc >>> 0
  }
  return table
})()

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i]
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff]
  }
  return (crc ^ 0xffffffff) >>> 0
}

function toDosDateTime(date: Date) {
  const year = Math.max(date.getFullYear(), 1980) - 1980
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const seconds = Math.floor(date.getSeconds() / 2)

  const dosDate = (year << 9) | (month << 5) | day
  const dosTime = (hours << 11) | (minutes << 5) | seconds

  return { date: dosDate, time: dosTime }
}

export function createZip(entries: ZipEntry[]): Buffer {
  const localParts: Buffer[] = []
  const centralParts: Buffer[] = []
  let offset = 0
  const now = new Date()
  const { date, time } = toDosDateTime(now)

  for (const entry of entries) {
    const fileName = Buffer.from(entry.path)
    const content = Buffer.from(entry.data, "utf8")
    const compressed = deflateRawSync(content)
    const crc = crc32(content)

    const localHeader = Buffer.alloc(30)
    localHeader.writeUInt32LE(0x04034b50, 0)
    localHeader.writeUInt16LE(20, 4)
    localHeader.writeUInt16LE(0, 6)
    localHeader.writeUInt16LE(8, 8)
    localHeader.writeUInt16LE(time, 10)
    localHeader.writeUInt16LE(date, 12)
    localHeader.writeUInt32LE(crc, 14)
    localHeader.writeUInt32LE(compressed.length, 18)
    localHeader.writeUInt32LE(content.length, 22)
    localHeader.writeUInt16LE(fileName.length, 26)
    localHeader.writeUInt16LE(0, 28)

    const localRecord = Buffer.concat([localHeader, fileName, compressed])
    localParts.push(localRecord)

    const centralHeader = Buffer.alloc(46)
    centralHeader.writeUInt32LE(0x02014b50, 0)
    centralHeader.writeUInt16LE(20, 4)
    centralHeader.writeUInt16LE(20, 6)
    centralHeader.writeUInt16LE(0, 8)
    centralHeader.writeUInt16LE(8, 10)
    centralHeader.writeUInt16LE(time, 12)
    centralHeader.writeUInt16LE(date, 14)
    centralHeader.writeUInt32LE(crc, 16)
    centralHeader.writeUInt32LE(compressed.length, 20)
    centralHeader.writeUInt32LE(content.length, 24)
    centralHeader.writeUInt16LE(fileName.length, 28)
    centralHeader.writeUInt16LE(0, 30)
    centralHeader.writeUInt16LE(0, 32)
    centralHeader.writeUInt16LE(0, 34)
    centralHeader.writeUInt32LE(0, 36)
    centralHeader.writeUInt32LE(offset, 42)

    const centralRecord = Buffer.concat([centralHeader, fileName])
    centralParts.push(centralRecord)

    offset += localRecord.length
  }

  const centralDir = Buffer.concat(centralParts)
  const localDir = Buffer.concat(localParts)

  const endRecord = Buffer.alloc(22)
  endRecord.writeUInt32LE(0x06054b50, 0)
  endRecord.writeUInt16LE(0, 4)
  endRecord.writeUInt16LE(0, 6)
  endRecord.writeUInt16LE(entries.length, 8)
  endRecord.writeUInt16LE(entries.length, 10)
  endRecord.writeUInt32LE(centralDir.length, 12)
  endRecord.writeUInt32LE(localDir.length, 16)
  endRecord.writeUInt16LE(0, 20)

  return Buffer.concat([localDir, centralDir, endRecord])
}
