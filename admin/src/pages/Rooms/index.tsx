
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
  AppstoreOutlined,
  ShopOutlined,
  UserOutlined,
  ToolOutlined,
  ProjectOutlined,
} from '@ant-design/icons';
import { createRoom, deleteRoom, getRooms, updateRoom } from '../../api/rooms';
import { getTheaters } from '../../api/theaters';
import { getErrorMessage } from '../../api/client';
import type { Room, Seat, Theater } from '../../api/types';

const { Title, Text } = Typography;

type PaintMode = 'normal' | 'vip' | 'couple' | 'maintenance';

const MAX_ROWS = 26;
const MAX_SEATS_PER_ROW = 20;
const DEFAULT_ROWS = 8;
const DEFAULT_SEATS_PER_ROW = 12;

const PAINT_MODE_OPTIONS: Array<{
  value: PaintMode;
  label: string;
  background: string;
  border: string;
  color: string;
}> = [
  {
    value: 'normal',
    label: 'Thường',
    background: '#e6f4ff',
    border: '#91caff',
    color: '#0958a5',
  },
  {
    value: 'vip',
    label: 'VIP',
    background: '#f9f0ff',
    border: '#d3adf7',
    color: '#722ed1',
  },
  {
    value: 'couple',
    label: 'Đôi',
    background: '#fff0f6',
    border: '#ffadd2',
    color: '#c41d7f',
  },
  {
    value: 'maintenance',
    label: 'Bảo trì',
    background: '#fff1f0',
    border: '#ffa39e',
    color: '#cf1322',
  },
];

interface RoomFormValues {
  name: string;
  theater: string;
}

const getTheaterId = (theater: Room['theater']): string =>
  typeof theater === 'string' ? theater : theater?._id ?? '';

const getTheaterName = (theater: Room['theater']): string =>
  typeof theater === 'string' ? theater : theater?.name ?? 'Chưa có thông tin';

const getSeatTypeLabel = (type: string): string => {
  switch (type) {
    case 'vip':
      return 'VIP';
    case 'couple':
      return 'Ghế đôi';
    case 'normal':
      return 'Thường';
    default:
      return type || 'Chưa phân loại';
  }
};

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const getRowLabel = (index: number): string => {
  let label = '';
  let number = index + 1;

  while (number > 0) {
    number -= 1;
    label = String.fromCharCode(65 + (number % 26)) + label;
    number = Math.floor(number / 26);
  }

  return label;
};

/** Đọc mã ghế dạng A1, B12... để xác định hàng và số ghế. */
const parseSeatCode = (
  code: string,
): { row: string; number: number } | null => {
  const match = /^([A-Za-z]+)\s*(\d+)$/.exec(code.trim());

  if (!match) return null;

  return {
    row: match[1].toUpperCase(),
    number: Number(match[2]),
  };
};

/**
 * Xếp loại ghế theo vị trí giống rạp thực tế:
 * - Hàng cuối là ghế đôi (khi số ghế chẵn).
 * - Các hàng giữa là VIP.
 * - Các hàng còn lại là ghế thường.
 */
const getAutoSeatType = (
  rowIndex: number,
  rowCount: number,
  seatsInRow: number,
): Seat['type'] => {
  if (
    rowCount >= 3 &&
    rowIndex === rowCount - 1 &&
    seatsInRow >= 2 &&
    seatsInRow % 2 === 0
  ) {
    return 'couple';
  }

  if (rowCount >= 4) {
    const vipStart = Math.max(1, Math.ceil(rowCount * 0.35));
    const vipEnd = Math.min(rowCount - 2, Math.floor(rowCount * 0.65));

    if (vipEnd >= vipStart && rowIndex >= vipStart && rowIndex <= vipEnd) {
      return 'vip';
    }
  }

  return 'normal';
};

/** Bản đồ loại ghế chuẩn theo bố cục hiện tại của phòng. */
const getAutoSeatTypeMap = (seats: Seat[]): Map<string, Seat['type']> => {
  const rows = groupSeatsByRow(seats);
  const rowIndexByLabel = new Map(
    rows.map((row, index) => [row.row, index]),
  );
  const seatCountByRow = new Map(
    rows.map((row) => [row.row, row.seats.length]),
  );

  return new Map(
    seats.map((seat) => {
      const parsed = parseSeatCode(seat.code);

      if (!parsed) {
        return [seat.code, seat.type] as [string, Seat['type']];
      }

      return [
        seat.code,
        getAutoSeatType(
          rowIndexByLabel.get(parsed.row) ?? 0,
          rows.length,
          seatCountByRow.get(parsed.row) ?? 0,
        ),
      ] as [string, Seat['type']];
    }),
  );
};

/**
 * Tạo sơ đồ ghế theo số hàng và số ghế mỗi hàng.
 * Loại ghế được xếp tự động giống rạp thực tế; trạng thái bảo trì
 * được giữ lại theo mã ghế.
 */
const buildSeatLayout = ({
  rows,
  seatsPerRow,
  currentSeats = [],
  autoArrange = true,
}: {
  rows: number;
  seatsPerRow: number;
  currentSeats?: Seat[];
  autoArrange?: boolean;
}): Seat[] => {
  const safeRows = clamp(Math.floor(Number(rows) || 0), 1, MAX_ROWS);
  const safeSeatsPerRow = clamp(
    Math.floor(Number(seatsPerRow) || 0),
    1,
    MAX_SEATS_PER_ROW,
  );

  const existingSeats = new Map(
    currentSeats.map((seat) => [seat.code.trim().toUpperCase(), seat]),
  );

  const layout: Seat[] = [];

  for (let rowIndex = 0; rowIndex < safeRows; rowIndex += 1) {
    const rowLabel = getRowLabel(rowIndex);

    for (let number = 1; number <= safeSeatsPerRow; number += 1) {
      const code = `${rowLabel}${number}`;
      const previousSeat = existingSeats.get(code);

      layout.push({
        code,
        type: autoArrange
          ? getAutoSeatType(rowIndex, safeRows, safeSeatsPerRow)
          : previousSeat?.type ?? 'normal',
        status: previousSeat?.status ?? 'available',
      });
    }
  }

  return layout;
};

/** Tạo sơ đồ dự phòng cho phòng cũ chưa lưu seatLayout. */
const buildLayoutFromCapacity = (capacity: number): Seat[] => {
  const safeCapacity = clamp(
    Math.floor(Number(capacity) || 0),
    1,
    MAX_ROWS * MAX_SEATS_PER_ROW,
  );
  const seatsPerRow = Math.min(safeCapacity, DEFAULT_SEATS_PER_ROW);
  const rows = Math.ceil(safeCapacity / seatsPerRow);

  // Không tự gán VIP/ghế đôi vì phòng cũ chưa có dữ liệu loại ghế.
  return buildSeatLayout({ rows, seatsPerRow, autoArrange: false }).slice(
    0,
    safeCapacity,
  );
};

const getRoomSeatLayout = (room: Room): Seat[] => {
  const savedLayout = room.seatLayout ?? [];

  return savedLayout.length > 0
    ? savedLayout
    : buildLayoutFromCapacity(room.capacity);
};

/** Nhóm ghế theo hàng để hiển thị thành sơ đồ. */
const groupSeatsByRow = (
  seats: Seat[],
): Array<{ row: string; seats: Seat[] }> => {
  const rowMap = new Map<string, Seat[]>();

  seats.forEach((seat) => {
    const parsed = parseSeatCode(seat.code);
    const row = parsed?.row ?? seat.code.charAt(0).toUpperCase();

    if (!rowMap.has(row)) {
      rowMap.set(row, []);
    }

    rowMap.get(row)!.push(seat);
  });

  return Array.from(rowMap.entries())
    .sort(([rowA], [rowB]) => {
      const lengthDiff = rowA.length - rowB.length;
      return lengthDiff !== 0 ? lengthDiff : rowA.localeCompare(rowB);
    })
    .map(([row, rowSeats]) => ({
      row,
      seats: [...rowSeats].sort((seatA, seatB) => {
        const numberA = parseSeatCode(seatA.code)?.number ?? 0;
        const numberB = parseSeatCode(seatB.code)?.number ?? 0;
        return numberA - numberB;
      }),
    }));
};

const getMaxSeatNumber = (seats: Seat[]): number =>
  seats.reduce((maxNumber, seat) => {
    const parsed = parseSeatCode(seat.code);
    return parsed ? Math.max(maxNumber, parsed.number) : maxNumber;
  }, 0);

/** Ghế đôi phải luôn đi theo cặp liền kề (1-2, 3-4...). */
const validateCoupleSeats = (seats: Seat[]): string | null => {
  const seatsByCode = new Map(seats.map((seat) => [seat.code, seat]));

  for (const seat of seats) {
    if (seat.type !== 'couple') continue;

    const parsed = parseSeatCode(seat.code);

    if (!parsed) {
      return `Mã ghế "${seat.code}" không hợp lệ. Mã ghế phải có dạng A1, B2...`;
    }

    const pairNumber =
      parsed.number % 2 === 1 ? parsed.number + 1 : parsed.number - 1;
    const pairCode = `${parsed.row}${pairNumber}`;
    const pairSeat = seatsByCode.get(pairCode);

    if (!pairSeat || pairSeat.type !== 'couple') {
      return `Ghế đôi ${seat.code} phải đi kèm ghế ${pairCode}. Vui lòng chọn cặp ghế liền kề.`;
    }
  }

  return null;
};

const getSeatColors = (seat: Seat) => {
  if (seat.status === 'maintenance') {
    return {
      background: '#fff1f0',
      border: '#ffa39e',
      color: '#cf1322',
    };
  }

  if (seat.type === 'vip') {
    return {
      background: '#f9f0ff',
      border: '#d3adf7',
      color: '#722ed1',
    };
  }

  if (seat.type === 'couple') {
    return {
      background: '#fff0f6',
      border: '#ffadd2',
      color: '#c41d7f',
    };
  }

  return {
    background: '#e6f4ff',
    border: '#91caff',
    color: '#0958a5',
  };
};

interface SeatGridProps {
  seats: Seat[];
  interactive?: boolean;
  onSeatClick?: (seat: Seat) => void;
}

/**
 * Sơ đồ ghế dạng lưới, có nhãn hàng hai bên giống cách
 * bố trí ghế trong rạp chiếu phim thực tế.
 */
const SeatGrid: React.FC<SeatGridProps> = ({
  seats,
  interactive = false,
  onSeatClick,
}) => {
  const rows = useMemo(() => groupSeatsByRow(seats), [seats]);
  const maxNumber = useMemo(
    () => Math.max(1, getMaxSeatNumber(seats)),
    [seats],
  );
  const seatNumbers = useMemo(
    () => Array.from({ length: maxNumber }, (_, index) => index + 1),
    [maxNumber],
  );
  const seatSize = interactive ? 34 : 30;

  return (
    <div style={{ overflowX: 'auto', padding: '4px 0' }}>
      <div style={{ width: 'fit-content', minWidth: '100%', margin: '0 auto' }}>
        {rows.map(({ row, seats: rowSeats }) => {
          const seatsByNumber = new Map(
            rowSeats.map((seat) => [
              parseSeatCode(seat.code)?.number ?? 0,
              seat,
            ]),
          );

          return (
            <div
              key={row}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4,
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  width: 22,
                  flexShrink: 0,
                  textAlign: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#667085',
                }}
              >
                {row}
              </span>

              <span style={{ width: 18, flexShrink: 0 }} />

              {seatNumbers.map((number) => {
                const seat = seatsByNumber.get(number);

                return (
                  <React.Fragment key={number}>
                    {seat
                      ? (() => {
                          const colors = getSeatColors(seat);
                          const isMaintenance = seat.status === 'maintenance';
                          const tooltip = `${seat.code} · ${getSeatTypeLabel(
                            seat.type,
                          )} · ${isMaintenance ? 'Bảo trì' : 'Khả dụng'}`;
                          const sharedStyle: React.CSSProperties = {
                            width: seatSize,
                            height: seatSize,
                            flexShrink: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                            borderRadius: 7,
                            border: `1px solid ${colors.border}`,
                            background: colors.background,
                            color: colors.color,
                            fontSize: interactive ? 11 : 10,
                            fontWeight: 700,
                            cursor: interactive ? 'pointer' : 'default',
                            transition: 'transform 0.15s, box-shadow 0.15s',
                          };

                          if (!interactive) {
                            return (
                              <span title={tooltip} style={sharedStyle}>
                                {isMaintenance ? '✕' : number}
                              </span>
                            );
                          }

                          return (
                            <button
                              type="button"
                              title={tooltip}
                              aria-label={tooltip}
                              onClick={() => onSeatClick?.(seat)}
                              onMouseEnter={(event) => {
                                event.currentTarget.style.transform =
                                  'scale(1.1)';
                                event.currentTarget.style.boxShadow =
                                  '0 4px 10px rgba(15, 23, 42, 0.18)';
                              }}
                              onMouseLeave={(event) => {
                                event.currentTarget.style.transform =
                                  'scale(1)';
                                event.currentTarget.style.boxShadow = 'none';
                              }}
                              style={sharedStyle}
                            >
                              {isMaintenance ? '✕' : number}
                            </button>
                          );
                        })()
                      : (
                        <span
                          key={`empty-${number}`}
                          style={{
                            width: seatSize,
                            height: seatSize,
                            flexShrink: 0,
                            borderRadius: 7,
                            border: '1px dashed #e4e7ec',
                            background: '#fafbfc',
                          }}
                        />
                      )}

                  </React.Fragment>
                );
              })}

              <span style={{ width: 18, flexShrink: 0 }} />

              <span
                style={{
                  width: 22,
                  flexShrink: 0,
                  textAlign: 'center',
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#667085',
                }}
              >
                {row}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const Rooms: React.FC = () => {
  const { message } = App.useApp();
  const [form] = Form.useForm<RoomFormValues>();

  const [data, setData] = useState<Room[]>([]);
  const [theaters, setTheaters] = useState<Theater[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);

  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [theaterFilter, setTheaterFilter] = useState<string | undefined>();

  const [seatLayout, setSeatLayout] = useState<Seat[]>([]);
  const [rowCount, setRowCount] = useState(DEFAULT_ROWS);
  const [seatsPerRow, setSeatsPerRow] = useState(DEFAULT_SEATS_PER_ROW);
  const [paintMode, setPaintMode] = useState<PaintMode>('normal');

  const fetchData = useCallback(async () => {
    setLoading(true);

    try {
      const [rooms, theatersList] = await Promise.all([
        getRooms(),
        getTheaters(),
      ]);

      setData(rooms);
      setTheaters(theatersList);

      setSelectedRoomId((currentId) => {
        if (currentId && rooms.some((room) => room._id === currentId)) {
          return currentId;
        }

        return rooms[0]?._id ?? null;
      });
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const filteredRooms = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return data.filter((room) => {
      const matchesSearch =
        !keyword ||
        room.name.toLowerCase().includes(keyword) ||
        getTheaterName(room.theater).toLowerCase().includes(keyword);

      const matchesTheater =
        !theaterFilter || getTheaterId(room.theater) === theaterFilter;

      return matchesSearch && matchesTheater;
    });
  }, [data, searchText, theaterFilter]);

  const selectedRoom = useMemo(
    () => filteredRooms.find((room) => room._id === selectedRoomId) ?? null,
    [filteredRooms, selectedRoomId],
  );

  const totalCapacity = data.reduce(
    (total, room) => total + (Number(room.capacity) || 0),
    0,
  );

  const configuredSeats = data.reduce(
    (total, room) => total + (room.seatLayout?.length ?? 0),
    0,
  );

  const maintenanceSeats = data.reduce(
    (total, room) =>
      total +
      (room.seatLayout ?? []).filter(
        (seat) => seat.status === 'maintenance',
      ).length,
    0,
  );

  const openCreate = () => {
    setEditing(null);
    setPaintMode('normal');
    setModalOpen(true);
  };

  const openEdit = (room: Room) => {
    setEditing(room);
    setPaintMode('normal');
    setModalOpen(true);
  };

  useEffect(() => {
    if (!modalOpen) return;

    form.resetFields();

    if (editing) {
      const layout = getRoomSeatLayout(editing).map((seat) => ({
        code: seat.code,
        type: seat.type,
        status: seat.status,
      }));
      const rows = groupSeatsByRow(layout);

      form.setFieldsValue({
        name: editing.name,
        theater: getTheaterId(editing.theater),
      });
      setSeatLayout(layout);
      setRowCount(Math.max(1, rows.length));
      setSeatsPerRow(Math.max(1, getMaxSeatNumber(layout)));
    } else {
      form.setFieldsValue({
        name: '',
        theater: undefined,
      });
      setSeatLayout(
        buildSeatLayout({
          rows: DEFAULT_ROWS,
          seatsPerRow: DEFAULT_SEATS_PER_ROW,
        }),
      );
      setRowCount(DEFAULT_ROWS);
      setSeatsPerRow(DEFAULT_SEATS_PER_ROW);
    }
  }, [modalOpen, editing, form]);

  const handleApplyLayout = () => {
    const rows = clamp(Math.floor(Number(rowCount) || 0), 1, MAX_ROWS);
    const columns = clamp(
      Math.floor(Number(seatsPerRow) || 0),
      1,
      MAX_SEATS_PER_ROW,
    );

    setRowCount(rows);
    setSeatsPerRow(columns);

    const applyLayout = () => {
      setSeatLayout((currentSeats) =>
        buildSeatLayout({
          rows,
          seatsPerRow: columns,
          currentSeats,
        }),
      );
      message.success(
        `Đã tạo sơ đồ ${rows} hàng × ${columns} ghế (${rows * columns} ghế)`,
      );
    };

    if (seatLayout.length === 0) {
      applyLayout();
      return;
    }

    Modal.confirm({
      title: 'Tạo lại sơ đồ ghế?',
      content: `Sơ đồ sẽ có ${rows} hàng × ${columns} ghế (${
        rows * columns
      } ghế). Loại ghế được xếp tự động (VIP ở hàng giữa, ghế đôi ở hàng cuối), trạng thái bảo trì được giữ theo mã ghế. Ghế nằm ngoài sơ đồ mới sẽ bị xóa.`,
      okText: 'Tạo sơ đồ',
      cancelText: 'Hủy',
      onOk: applyLayout,
    });
  };

  const handleAutoArrange = () => {
    if (seatLayout.length === 0) {
      message.warning('Vui lòng tạo sơ đồ ghế trước');
      return;
    }

    const autoTypes = getAutoSeatTypeMap(seatLayout);
    const changedCount = seatLayout.filter(
      (seat) => autoTypes.get(seat.code) !== seat.type,
    ).length;

    const applyAutoArrange = () => {
      setSeatLayout((currentSeats) => {
        const currentAutoTypes = getAutoSeatTypeMap(currentSeats);

        return currentSeats.map((seat) => ({
          ...seat,
          type: currentAutoTypes.get(seat.code) ?? seat.type,
        }));
      });

      message.success(
        'Đã xếp loại tự động: hàng giữa là VIP, hàng cuối là ghế đôi',
      );
    };

    if (changedCount === 0) {
      applyAutoArrange();
      return;
    }

    Modal.confirm({
      title: 'Xếp loại tự động?',
      content: `Thao tác này sẽ ghi đè loại ghế của ${changedCount} ghế bạn đã chỉnh tay (Thường/VIP/Đôi). Trạng thái bảo trì được giữ nguyên.`,
      okText: 'Xếp loại',
      cancelText: 'Hủy',
      onOk: applyAutoArrange,
    });
  };

  const handleSeatPaint = (seat: Seat) => {
    const parsed = parseSeatCode(seat.code);

    if (!parsed) {
      message.warning(`Mã ghế "${seat.code}" không hợp lệ`);
      return;
    }

    const pairNumber =
      parsed.number % 2 === 1 ? parsed.number + 1 : parsed.number - 1;
    const pairCode = `${parsed.row}${pairNumber}`;
    const pairSeat = seatLayout.find((item) => item.code === pairCode);

    if (paintMode === 'couple' && !pairSeat) {
      message.warning(
        `Ghế ${seat.code} không có ghế liền kề để tạo cặp ghế đôi`,
      );
      return;
    }

    setSeatLayout((currentSeats) =>
      currentSeats.map((currentSeat) => {
        const isTarget = currentSeat.code === seat.code;
        const isPair = pairSeat?.code === currentSeat.code;

        if (paintMode === 'maintenance') {
          return isTarget
            ? { ...currentSeat, status: 'maintenance' }
            : currentSeat;
        }

        if (paintMode === 'couple') {
          return isTarget || isPair
            ? {
                ...currentSeat,
                type: 'couple',
                status:
                  currentSeat.status === 'maintenance'
                    ? 'maintenance'
                    : 'available',
              }
            : currentSeat;
        }

        if (isTarget) {
          return { ...currentSeat, type: paintMode, status: 'available' };
        }

        // Đổi một nửa ghế đôi sang loại khác thì đổi luôn nửa còn lại
        if (
          seat.type === 'couple' &&
          isPair &&
          currentSeat.type === 'couple'
        ) {
          return {
            ...currentSeat,
            type: paintMode,
            status:
              currentSeat.status === 'maintenance'
                ? 'maintenance'
                : 'available',
          };
        }

        return currentSeat;
      }),
    );
  };

  const handleSubmit = async () => {
    let values: RoomFormValues;

    try {
      values = await form.validateFields();
    } catch {
      return;
    }

    if (seatLayout.length === 0) {
      message.error('Vui lòng tạo sơ đồ ghế trước khi lưu phòng');
      return;
    }

    const normalizedSeats = seatLayout.map((seat) => ({
      code: seat.code.trim().toUpperCase(),
      type: seat.type,
      status: seat.status,
    }));

    const seenCodes = new Set<string>();

    for (const seat of normalizedSeats) {
      if (!parseSeatCode(seat.code)) {
        message.error(
          `Mã ghế "${seat.code}" không hợp lệ. Mã ghế phải có dạng A1, B2...`,
        );
        return;
      }

      if (seenCodes.has(seat.code)) {
        message.error(`Mã ghế ${seat.code} bị trùng trong sơ đồ`);
        return;
      }

      seenCodes.add(seat.code);
    }

    const coupleError = validateCoupleSeats(normalizedSeats);

    if (coupleError) {
      message.error(coupleError);
      return;
    }

    const capacity = normalizedSeats.length;

    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        name: values.name.trim(),
        theater: values.theater,
        capacity,
        seatLayout: normalizedSeats,
      };

      if (editing) {
        await updateRoom(editing._id, payload);
        message.success(`Đã cập nhật phòng với ${capacity} ghế`);
      } else {
        await createRoom(payload);
        message.success(`Đã tạo phòng với ${capacity} ghế`);
      }

      setModalOpen(false);
      await fetchData();
    } catch (err) {
      message.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRoom(id);
      message.success('Xóa phòng chiếu thành công');

      if (selectedRoomId === id) {
        setSelectedRoomId(null);
      }

      await fetchData();
    } catch (err) {
      message.error(getErrorMessage(err));
    }
  };

  const statCards = [
    {
      title: 'Tổng phòng chiếu',
      value: data.length,
      icon: <AppstoreOutlined />,
      color: '#1677ff',
      background: '#eaf3ff',
      suffix: 'phòng',
    },
    {
      title: 'Tổng sức chứa',
      value: totalCapacity,
      icon: <UserOutlined />,
      color: '#722ed1',
      background: '#f4ebff',
      suffix: 'ghế',
    },
    {
      title: 'Ghế đã cấu hình',
      value: configuredSeats,
      icon: <ProjectOutlined />,
      color: '#08979c',
      background: '#e6fffb',
      suffix: 'ghế',
    },
    {
      title: 'Ghế bảo trì',
      value: maintenanceSeats,
      icon: <ToolOutlined />,
      color: '#d48806',
      background: '#fff7e6',
      suffix: 'ghế',
    },
  ];

  const selectedSeats = selectedRoom ? getRoomSeatLayout(selectedRoom) : [];
  const selectedCoupleError = validateCoupleSeats(selectedSeats);
  const editingCoupleError = validateCoupleSeats(seatLayout);

  const seatLayoutRows = useMemo(
    () => groupSeatsByRow(seatLayout),
    [seatLayout],
  );
  const seatLayoutSeatsPerRow = useMemo(
    () => Math.max(1, getMaxSeatNumber(seatLayout)),
    [seatLayout],
  );
  const seatLayoutVipCount = seatLayout.filter(
    (seat) => seat.type === 'vip',
  ).length;
  const seatLayoutCoupleCount = seatLayout.filter(
    (seat) => seat.type === 'couple',
  ).length;
  const seatLayoutMaintenanceCount = seatLayout.filter(
    (seat) => seat.status === 'maintenance',
  ).length;

  const selectedAvailableSeats = selectedSeats.filter(
    (seat) => seat.status === 'available',
  ).length;

  const selectedMaintenanceSeats = selectedSeats.filter(
    (seat) => seat.status === 'maintenance',
  ).length;

  return (
    <div style={{ minHeight: '100%', padding: 24, background: '#f5f7fb' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          marginBottom: 24,
        }}
      >
        <div>
          <Title level={2} style={{ margin: 0, color: '#172033' }}>
            Phòng chiếu
          </Title>
          <Text type="secondary">
            Quản lý phòng, sức chứa và sơ đồ ghế tại các rạp
          </Text>
        </div>

        <Button
          type="primary"
          size="large"
          icon={<PlusOutlined />}
          onClick={openCreate}
        >
          Tạo phòng chiếu mới
        </Button>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {statCards.map((item) => (
          <Col xs={24} sm={12} xl={6} key={item.title}>
            <Card
              bordered={false}
              style={{
                height: '100%',
                borderRadius: 12,
                boxShadow: '0 2px 10px rgba(20, 40, 80, 0.04)',
              }}
              styles={{ body: { padding: 20 } }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                }}
              >
                <div>
                  <Text type="secondary">{item.title}</Text>
                  <div style={{ marginTop: 8 }}>
                    <Statistic
                      value={item.value}
                      suffix={item.suffix}
                      valueStyle={{
                        color: '#172033',
                        fontSize: 25,
                        fontWeight: 700,
                      }}
                    />
                  </div>
                </div>

                <div
                  style={{
                    width: 48,
                    height: 48,
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 12,
                    color: item.color,
                    background: item.background,
                    fontSize: 23,
                  }}
                >
                  {item.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      <Card
        bordered={false}
        style={{
          borderRadius: 12,
          marginBottom: 24,
          boxShadow: '0 2px 10px rgba(20, 40, 80, 0.04)',
        }}
        styles={{ body: { padding: 16 } }}
      >
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} md={12} lg={10}>
            <Input
              allowClear
              size="large"
              prefix={<SearchOutlined style={{ color: '#8c8c8c' }} />}
              placeholder="Tìm theo tên phòng hoặc tên rạp..."
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
          </Col>

          <Col xs={24} md={8} lg={7}>
            <Select
              allowClear
              size="large"
              style={{ width: '100%' }}
              placeholder="Tất cả rạp"
              value={theaterFilter}
              onChange={setTheaterFilter}
              options={theaters.map((theater) => ({
                value: theater._id,
                label: theater.name,
              }))}
            />
          </Col>

          <Col xs={24} md={4} lg={7}>
            <Text type="secondary">
              Hiển thị {filteredRooms.length} / {data.length} phòng
            </Text>
          </Col>
        </Row>
      </Card>

      <Row gutter={[20, 20]} align="stretch">
        <Col xs={24} xl={9}>
          <Card
            bordered={false}
            style={{
              height: '100%',
              borderRadius: 12,
              boxShadow: '0 2px 10px rgba(20, 40, 80, 0.04)',
            }}
            styles={{ body: { padding: 16 } }}
            title={
              <Space>
                <ShopOutlined />
                <span>Danh sách phòng chiếu</span>
              </Space>
            }
            extra={<Tag color="blue">{filteredRooms.length} phòng</Tag>}
          >
            <Spin spinning={loading}>
              {filteredRooms.length === 0 ? (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    data.length === 0
                      ? 'Chưa có phòng chiếu'
                      : 'Không tìm thấy phòng phù hợp'
                  }
                >
                  {data.length === 0 && (
                    <Button type="primary" onClick={openCreate}>
                      Thêm phòng đầu tiên
                    </Button>
                  )}
                </Empty>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {filteredRooms.map((room) => {
                    const isSelected = room._id === selectedRoomId;
                    const seatCount = room.seatLayout?.length ?? 0;
                    const roomMaintenance = (room.seatLayout ?? []).filter(
                      (seat) => seat.status === 'maintenance',
                    ).length;

                    return (
                      <div
                        key={room._id}
                        onClick={() => setSelectedRoomId(room._id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            setSelectedRoomId(room._id);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                        style={{
                          padding: 16,
                          borderRadius: 10,
                          border: isSelected
                            ? '1px solid #1677ff'
                            : '1px solid #e8edf5',
                          background: isSelected ? '#f0f6ff' : '#fff',
                          cursor: 'pointer',
                          outline: 'none',
                          transition: 'all 0.2s',
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: 10,
                          }}
                        >
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <Text
                              strong
                              style={{
                                display: 'block',
                                fontSize: 16,
                                color: '#172033',
                                overflowWrap: 'anywhere',
                              }}
                            >
                              {room.name}
                            </Text>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {getTheaterName(room.theater)}
                            </Text>
                          </div>
                          <Tag color={isSelected ? 'blue' : 'default'}>
                            {room.capacity} ghế
                          </Tag>
                        </div>

                        <Divider style={{ margin: '12px 0' }} />

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            flexWrap: 'wrap',
                            gap: 8,
                          }}
                        >
                          <Space size={6} wrap>
                            <Tag color="cyan">{seatCount} ghế đã lưu</Tag>
                            {roomMaintenance > 0 && (
                              <Tag color="orange">
                                {roomMaintenance} ghế bảo trì
                              </Tag>
                            )}
                          </Space>

                          <Space size={4}>
                            <Button
                              size="small"
                              icon={<EditOutlined />}
                              onClick={(event) => {
                                event.stopPropagation();
                                openEdit(room);
                              }}
                            >
                              Sửa
                            </Button>

                            <Popconfirm
                              title="Xóa phòng chiếu này?"
                              description="Thao tác này không thể hoàn tác."
                              okText="Xóa"
                              cancelText="Hủy"
                              onConfirm={() => handleDelete(room._id)}
                            >
                              <Button
                                danger
                                size="small"
                                icon={<DeleteOutlined />}
                                onClick={(event) => event.stopPropagation()}
                              />
                            </Popconfirm>
                          </Space>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Spin>
          </Card>
        </Col>

        <Col xs={24} xl={15}>
          <Card
            bordered={false}
            style={{
              height: '100%',
              minHeight: 420,
              borderRadius: 12,
              boxShadow: '0 2px 10px rgba(20, 40, 80, 0.04)',
            }}
            styles={{ body: { padding: 20 } }}
            title={
              <Space>
                <ProjectOutlined />
                <span>Sơ đồ ghế phòng chiếu</span>
              </Space>
            }
            extra={
              selectedRoom ? (
                <Button
                  icon={<EditOutlined />}
                  onClick={() => openEdit(selectedRoom)}
                >
                  Chỉnh sửa
                </Button>
              ) : null
            }
          >
            {!selectedRoom ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  data.length === 0
                    ? 'Thêm phòng chiếu để xem sơ đồ ghế'
                    : 'Chọn phòng chiếu để xem sơ đồ ghế'
                }
              />
            ) : (
              <>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  <div>
                    <Title level={4} style={{ margin: 0 }}>
                      {selectedRoom.name}
                    </Title>
                    <Text type="secondary">
                      {getTheaterName(selectedRoom.theater)}
                    </Text>
                  </div>
                  <Tag color="blue">
                    Sức chứa: {selectedRoom.capacity} ghế
                  </Tag>
                </div>

                <Row gutter={[12, 12]} style={{ marginBottom: 24 }}>
                  <Col xs={12} sm={8}>
                    <Card size="small" style={{ background: '#f7faff', borderRadius: 8 }}>
                      <Text type="secondary">Sức chứa</Text>
                      <Title level={4} style={{ margin: '6px 0 0' }}>
                        {selectedSeats.length}
                      </Title>
                    </Card>
                  </Col>
                  <Col xs={12} sm={8}>
                    <Card size="small" style={{ background: '#f6ffed', borderRadius: 8 }}>
                      <Text type="secondary">Khả dụng</Text>
                      <Title level={4} style={{ margin: '6px 0 0' }}>
                        {selectedAvailableSeats}
                      </Title>
                    </Card>
                  </Col>
                  <Col xs={24} sm={8}>
                    <Card size="small" style={{ background: '#fff7e6', borderRadius: 8 }}>
                      <Text type="secondary">Bảo trì</Text>
                      <Title level={4} style={{ margin: '6px 0 0' }}>
                        {selectedMaintenanceSeats}
                      </Title>
                    </Card>
                  </Col>
                </Row>

                <div
                  style={{
                    padding: '12px 16px',
                    margin: '0 auto 24px',
                    maxWidth: 600,
                    textAlign: 'center',
                    color: '#667085',
                    background: '#edf1f7',
                    borderRadius: '8px 8px 24px 24px',
                    borderTop: '4px solid #aab5c5',
                    letterSpacing: 3,
                    fontWeight: 600,
                  }}
                >
                  MÀN HÌNH
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    flexWrap: 'wrap',
                    gap: 10,
                    marginBottom: 20,
                  }}
                >
                  {[
                    { label: 'Thường', background: '#e6f4ff', border: '#91caff' },
                    { label: 'VIP', background: '#f9f0ff', border: '#d3adf7' },
                    { label: 'Ghế đôi', background: '#fff0f6', border: '#ffadd2' },
                    { label: 'Bảo trì', background: '#fff1f0', border: '#ffa39e' },
                  ].map((item) => (
                    <Space key={item.label} size={5}>
                      <span
                        style={{
                          width: 12,
                          height: 12,
                          borderRadius: 3,
                          display: 'inline-block',
                          background: item.background,
                          border: `1px solid ${item.border}`,
                        }}
                      />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {item.label}
                      </Text>
                    </Space>
                  ))}
                </div>

                <SeatGrid seats={selectedSeats} />

                <Text
                  type="secondary"
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    marginTop: 16,
                    fontSize: 12,
                  }}
                >
                  Sơ đồ gồm {groupSeatsByRow(selectedSeats).length} hàng và{' '}
                  {selectedSeats.length} ghế.
                </Text>

                {selectedCoupleError && (
                  <Text
                    type="warning"
                    style={{
                      display: 'block',
                      textAlign: 'center',
                      marginTop: 8,
                      fontSize: 12,
                    }}
                  >
                    Sơ đồ đang có ghế đôi chưa đúng cặp. Bấm “Chỉnh sửa” rồi
                    chọn “Xếp loại tự động” để chuẩn hóa.
                  </Text>
                )}
              </>
            )}
          </Card>
        </Col>
      </Row>

      <Modal
        title={editing ? 'Cập nhật phòng chiếu' : 'Tạo phòng chiếu mới'}
        open={modalOpen}
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={saving}
        okText={editing ? 'Lưu thay đổi' : 'Tạo phòng'}
        cancelText="Hủy"
        width={900}
        forceRender
        destroyOnHidden
        styles={{
          body: {
            maxHeight: 'calc(100vh - 220px)',
            overflowY: 'auto',
            paddingRight: 8,
          },
        }}
      >
        <Form form={form} layout="vertical" preserve={false}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name="name"
                label="Tên phòng chiếu"
                rules={[
                  { required: true, message: 'Vui lòng nhập tên phòng' },
                  { whitespace: true, message: 'Tên phòng không được để trống' },
                ]}
              >
                <Input placeholder="Ví dụ: Phòng 1" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="theater"
                label="Rạp chiếu"
                rules={[{ required: true, message: 'Vui lòng chọn rạp' }]}
              >
                <Select
                  placeholder="Chọn rạp chiếu"
                  showSearch
                  optionFilterProp="label"
                  options={theaters.map((theater) => ({
                    value: theater._id,
                    label: theater.name,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          <Row gutter={[16, 16]} align="middle" style={{ marginBottom: 16 }}>
            <Col xs={24} md={7}>
              <Title level={5} style={{ margin: 0 }}>
                Cấu hình sơ đồ ghế
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Chọn số hàng, số ghế mỗi hàng rồi bấm “Áp dụng sơ đồ”.
              </Text>
            </Col>

            <Col xs={12} md={4}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Số hàng
              </Text>
              <InputNumber
                min={1}
                max={MAX_ROWS}
                precision={0}
                value={rowCount}
                onChange={(value) => setRowCount(Number(value) || 1)}
                style={{ width: '100%' }}
              />
            </Col>

            <Col xs={12} md={4}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Ghế mỗi hàng
              </Text>
              <InputNumber
                min={1}
                max={MAX_SEATS_PER_ROW}
                precision={0}
                value={seatsPerRow}
                onChange={(value) => setSeatsPerRow(Number(value) || 1)}
                style={{ width: '100%' }}
              />
            </Col>

            <Col xs={24} md={9}>
              <Space
                wrap
                size={10}
                style={{ width: '100%', justifyContent: 'flex-end' }}
              >
                <Button
                  type="primary"
                  icon={<AppstoreOutlined />}
                  onClick={handleApplyLayout}
                >
                  Áp dụng sơ đồ
                </Button>

                <Button
                  onClick={handleAutoArrange}
                  title="Áp dụng lại loại ghế chuẩn (VIP hàng giữa, ghế đôi hàng cuối). Sẽ hỏi xác nhận nếu có ghế đã chỉnh tay."
                >
                  Xếp loại tự động
                </Button>
              </Space>
            </Col>
          </Row>

          <div
            style={{
              border: '1px solid #e8edf5',
              borderRadius: 12,
              padding: 16,
              background: '#fbfcff',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 10,
                marginBottom: 12,
              }}
            >
              <div>
                <Text strong>Chỉnh sửa ghế</Text>
                <Text
                  type="secondary"
                  style={{ display: 'block', fontSize: 12 }}
                >
                  Chọn loại ghế bên dưới rồi bấm trực tiếp vào ghế để đổi.
                </Text>
              </div>

              <Tag color="blue">
                {seatLayoutRows.length} hàng · tối đa{' '}
                {seatLayoutSeatsPerRow} ghế/hàng · {seatLayout.length} ghế
              </Tag>
            </div>

            <Space wrap size={8} style={{ marginBottom: 12 }}>
              {PAINT_MODE_OPTIONS.map((option) => {
                const isActive = paintMode === option.value;

                return (
                  <Button
                    key={option.value}
                    size="small"
                    onClick={() => setPaintMode(option.value)}
                    style={{
                      background: isActive ? option.background : '#fff',
                      borderColor: isActive ? option.border : '#d9d9d9',
                      color: isActive ? option.color : '#475467',
                      fontWeight: isActive ? 700 : 400,
                      boxShadow: isActive
                        ? `0 0 0 2px ${option.border}55`
                        : 'none',
                    }}
                  >
                    <span
                      style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: 2,
                        background: option.background,
                        border: `1px solid ${option.border}`,
                        marginRight: 6,
                      }}
                    />
                    {option.label}
                  </Button>
                );
              })}
            </Space>

            <div
              style={{
                padding: '10px 16px',
                margin: '8px auto 18px',
                maxWidth: 560,
                textAlign: 'center',
                color: '#667085',
                background: '#edf1f7',
                borderRadius: '8px 8px 24px 24px',
                borderTop: '4px solid #aab5c5',
                letterSpacing: 3,
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              MÀN HÌNH
            </div>

            <SeatGrid
              seats={seatLayout}
              interactive
              onSeatClick={handleSeatPaint}
            />

            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Sức chứa {seatLayout.length} ghế · VIP {seatLayoutVipCount} ·
                Đôi {seatLayoutCoupleCount} · Bảo trì{' '}
                {seatLayoutMaintenanceCount}
              </Text>
              <Text
                type="secondary"
                style={{ display: 'block', marginTop: 4, fontSize: 12 }}
              >
                Ghế đôi phải đi theo cặp liền kề. Lối đi nằm ở hai bên sơ đồ.
              </Text>

              {editingCoupleError && (
                <Text
                  type="warning"
                  style={{ display: 'block', marginTop: 6, fontSize: 12 }}
                >
                  {editingCoupleError} Bấm “Xếp loại tự động” để chuẩn hóa sơ đồ.
                </Text>
              )}
            </div>
          </div>
        </Form>
      </Modal>
    </div>
  );
};

export default Rooms;
