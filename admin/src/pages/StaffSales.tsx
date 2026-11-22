import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  ReloadOutlined,
  ShoppingCartOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';

import {
  getSalesShowtimes,
  getSalesSeatMap,
  lockSalesSeats,
  releaseSalesSeats,
} from '../api/staffSales';

const { Title, Text } = Typography;

type SeatStatus = 'available' | 'locked' | 'booked';
type SeatType = 'normal' | 'vip' | 'couple';

interface SalesMovie {
  _id?: string;
  id?: string;
  title?: string;
  posterUrl?: string;
  duration?: number;
}

interface SalesTheater {
  _id?: string;
  id?: string;
  name?: string;
  address?: string;
}

interface SalesRoom {
  _id?: string;
  id?: string;
  name?: string;
  totalSeats?: number;
  capacity?: number;
}

interface SalesShowtime {
  _id: string;
  movie: SalesMovie | string;
  theater: SalesTheater | string;
  room: SalesRoom | string;
  startTime: string;
  endTime: string;
  price: number;
  finalPrice?: number;
  status?: string;
}

interface SeatItem {
  code: string;
  row: string;
  number: number;
  type: SeatType;
  status: SeatStatus;
  physicalStatus: 'available' | 'maintenance';
  price: number;
  isMine?: boolean;
}

interface SeatMapData {
  showtime: {
    id: string;
    startTime: string;
    endTime: string;
    basePrice: number;
    movie: SalesMovie;
    theater: SalesTheater;
    room: SalesRoom;
  };
  seats: SeatItem[];
}

interface LockResult {
  ticketId: string;
  showtimeId: string;
  seats: string[];
  totalAmount: number;
  lockedUntil: string;
  expiresInSeconds: number;
}

const formatMoney = (value: number) =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value?: string) => {
  if (!value) return '--';
  return new Date(value).toLocaleDateString('vi-VN');
};

const formatTime = (value?: string) => {
  if (!value) return '--:--';
  return new Date(value).toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getId = (value: string | { _id?: string; id?: string } | undefined) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value._id || value.id || '';
};

const getName = (
  value: string | { name?: string; title?: string } | undefined,
) => {
  if (!value) return 'Chưa có dữ liệu';
  if (typeof value === 'string') return value;
  return value.title || value.name || 'Chưa có tên';
};

const getMovieTitle = (movie: SalesMovie | string) => {
  if (typeof movie === 'string') return 'Phim';
  return movie.title || 'Phim chưa có tên';
};

const seatColor = (seat: SeatItem, selected: boolean) => {
  if (selected) return '#1677ff';
  if (seat.physicalStatus === 'maintenance') return '#a0a0a0';
  if (seat.status === 'booked') return '#595959';
  if (seat.status === 'locked' && !seat.isMine) return '#fa8c16';
  if (seat.isMine) return '#13a8a8';

  if (seat.type === 'vip') return '#fadb14';
  if (seat.type === 'couple') return '#eb2f96';

  return '#e6f4ff';
};

const seatTextColor = (seat: SeatItem, selected: boolean) => {
  if (selected || seat.status === 'booked' || seat.isMine) return '#ffffff';
  if (seat.status === 'locked' && !seat.isMine) return '#ffffff';
  if (seat.type === 'vip' || seat.type === 'couple') return '#262626';
  return '#1677ff';
};

const StaffSales: React.FC = () => {
  const [showtimes, setShowtimes] = useState<SalesShowtime[]>([]);
  const [loadingShowtimes, setLoadingShowtimes] = useState(false);
  const [loadingSeats, setLoadingSeats] = useState(false);
  const [locking, setLocking] = useState(false);

  const [selectedMovieId, setSelectedMovieId] = useState<string>();
  const [selectedShowtimeId, setSelectedShowtimeId] = useState<string>();
  const [seatMap, setSeatMap] = useState<SeatMapData | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [lockResult, setLockResult] = useState<LockResult | null>(null);

  // Lấy danh sách suất chiếu
  const loadShowtimes = async () => {
    setLoadingShowtimes(true);

    try {
      const data = await getSalesShowtimes();
      const normalized = data as unknown as SalesShowtime[];

      setShowtimes(normalized);

      if (selectedShowtimeId) {
        const stillExists = normalized.some(
          (item) => item._id === selectedShowtimeId,
        );

        if (!stillExists) {
          setSelectedShowtimeId(undefined);
          setSeatMap(null);
          setSelectedSeats([]);
          setLockResult(null);
        }
      }
    } catch {
      message.error('Không thể tải danh sách suất chiếu');
    } finally {
      setLoadingShowtimes(false);
    }
  };

  useEffect(() => {
    void loadShowtimes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Chỉ hiển thị suất chiếu còn có thể bán
  const availableShowtimes = useMemo(() => {
    const now = Date.now();

    return showtimes.filter((item) => {
      const start = new Date(item.startTime).getTime();

      return (
        start > now &&
        item.status?.toLowerCase() !== 'cancelled' &&
        item.status?.toLowerCase() !== 'canceled'
      );
    });
  }, [showtimes]);

  // Danh sách phim trong các suất chiếu
  const movieOptions = useMemo(() => {
    const movieMap = new Map<string, string>();

    availableShowtimes.forEach((item) => {
      const movieId = getId(item.movie);
      if (movieId) {
        movieMap.set(movieId, getMovieTitle(item.movie));
      }
    });

    return Array.from(movieMap.entries()).map(([value, label]) => ({
      value,
      label,
    }));
  }, [availableShowtimes]);

  // Lọc suất theo phim
  const filteredShowtimes = useMemo(() => {
    if (!selectedMovieId) return [];

    return availableShowtimes
      .filter((item) => getId(item.movie) === selectedMovieId)
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() -
          new Date(b.startTime).getTime(),
      );
  }, [availableShowtimes, selectedMovieId]);

  // Chọn phim
  const handleSelectMovie = (movieId: string) => {
    setSelectedMovieId(movieId);
    setSelectedShowtimeId(undefined);
    setSeatMap(null);
    setSelectedSeats([]);
    setLockResult(null);
  };

  // Tải sơ đồ ghế
  const handleSelectShowtime = async (showtimeId: string) => {
    setSelectedShowtimeId(showtimeId);
    setSeatMap(null);
    setSelectedSeats([]);
    setLockResult(null);
    setLoadingSeats(true);

    try {
      const data = await getSalesSeatMap(showtimeId);
      setSeatMap(data as SeatMapData);
    } catch {
      message.error('Không thể tải sơ đồ ghế của suất chiếu');
    } finally {
      setLoadingSeats(false);
    }
  };

  // Làm mới sơ đồ ghế
  const refreshSeatMap = async () => {
    if (!selectedShowtimeId) return;

    setLoadingSeats(true);

    try {
      const data = await getSalesSeatMap(selectedShowtimeId);
      setSeatMap(data as SeatMapData);
    } catch {
      message.error('Làm mới sơ đồ ghế thất bại');
    } finally {
      setLoadingSeats(false);
    }
  };

  // Chọn / bỏ chọn ghế
  const handleSeatClick = (seat: SeatItem) => {
    if (seat.physicalStatus === 'maintenance') {
      message.warning('Ghế này đang bảo trì');
      return;
    }

    if (seat.status === 'booked') {
      message.warning('Ghế này đã được bán');
      return;
    }

    if (seat.status === 'locked' && !seat.isMine) {
      message.warning('Ghế đang được khách khác giữ');
      return;
    }

    setSelectedSeats((previous) => {
      const exists = previous.includes(seat.code);

      return exists
        ? previous.filter((code) => code !== seat.code)
        : [...previous, seat.code];
    });
  };

  // Giá tổng của ghế đã chọn
  const selectedTotal = useMemo(() => {
    if (!seatMap) return 0;

    return seatMap.seats
      .filter((seat) => selectedSeats.includes(seat.code))
      .reduce((total, seat) => total + seat.price, 0);
  }, [seatMap, selectedSeats]);

  // Chia ghế theo hàng
  const seatRows = useMemo(() => {
    if (!seatMap) return [];

    const rowMap = new Map<string, SeatItem[]>();

    seatMap.seats.forEach((seat) => {
      if (!rowMap.has(seat.row)) {
        rowMap.set(seat.row, []);
      }

      rowMap.get(seat.row)!.push(seat);
    });

    return Array.from(rowMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([row, seats]) => ({
        row,
        seats: seats.sort((a, b) => a.number - b.number),
      }));
  }, [seatMap]);

  // Giữ ghế
  const handleLockSeats = async () => {
    if (!selectedShowtimeId || selectedSeats.length === 0) {
      message.warning('Vui lòng chọn suất chiếu và ghế');
      return;
    }

    setLocking(true);

    try {
      const result = (await lockSalesSeats({
        showtimeId: selectedShowtimeId,
        seats: selectedSeats,
        ticketId: lockResult?.ticketId,
      })) as LockResult;

      setLockResult(result);
      message.success('Giữ ghế thành công!');
      await refreshSeatMap();
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Không thể giữ ghế, vui lòng thử lại';

      message.error(errorMessage);
      await refreshSeatMap();
    } finally {
      setLocking(false);
    }
  };

  // Hủy giữ ghế
  const handleReleaseSeats = async () => {
    if (!lockResult?.ticketId) return;

    try {
      await releaseSalesSeats(lockResult.ticketId);
      setLockResult(null);
      setSelectedSeats([]);
      message.success('Đã hủy giữ ghế');
      await refreshSeatMap();
    } catch {
      message.error('Không thể hủy giữ ghế');
    }
  };

  const selectedShowtime = showtimes.find(
    (item) => item._id === selectedShowtimeId,
  );


  return (
    <div style={{ padding: 24, minHeight: '100%', background: '#f5f7fb' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
          marginBottom: 24,
        }}
      >
        <div>
          <Text
            style={{
              color: '#1677ff',
              fontWeight: 600,
              letterSpacing: 1,
            }}
          >
            STAFF / COUNTER
          </Text>

          <Title level={2} style={{ margin: '6px 0 4px' }}>
            Bán vé tại quầy
          </Title>

          <Text type="secondary">
            Chọn phim, suất chiếu và ghế cho khách hàng
          </Text>
        </div>

        <Button
          icon={<ReloadOutlined />}
          onClick={loadShowtimes}
          loading={loadingShowtimes}
        >
          Làm mới suất chiếu
        </Button>
      </div>

      {/* Bước 1 - Chọn phim */}
      <Card
        title={
          <Space>
            <span
              style={{
                background: '#1677ff',
                color: '#fff',
                borderRadius: 20,
                width: 26,
                height: 26,
                display: 'inline-flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              1
            </span>
            Chọn phim
          </Space>
        }
        style={{ borderRadius: 14, marginBottom: 20 }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Phim đang có suất chiếu
            </Text>

            <Select
              size="large"
              placeholder="Chọn phim cần bán vé"
              style={{ width: '100%' }}
              value={selectedMovieId}
              onChange={handleSelectMovie}
              options={movieOptions}
              showSearch
              optionFilterProp="label"
              loading={loadingShowtimes}
            />
          </Col>

          <Col xs={24} md={12}>
            <div
              style={{
                background: '#f0f5ff',
                height: '100%',
                minHeight: 64,
                padding: 16,
                borderRadius: 10,
              }}
            >
              <Text type="secondary">Số phim có suất chiếu sắp tới</Text>
              <Title level={3} style={{ margin: '4px 0 0', color: '#1677ff' }}>
                {movieOptions.length} phim
              </Title>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Bước 2 - Chọn suất */}
      <Card
        title={
          <Space>
            <span
              style={{
                background: '#1677ff',
                color: '#fff',
                borderRadius: 20,
                width: 26,
                height: 26,
                display: 'inline-flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              2
            </span>
            Chọn suất chiếu
          </Space>
        }
        style={{ borderRadius: 14, marginBottom: 20 }}
      >
        {!selectedMovieId ? (
          <Empty description="Vui lòng chọn phim trước" />
        ) : filteredShowtimes.length === 0 ? (
          <Empty description="Phim này hiện không có suất chiếu sắp tới" />
        ) : (
          <Row gutter={[12, 12]}>
            {filteredShowtimes.map((item) => {
              const active = selectedShowtimeId === item._id;

              return (
                <Col xs={24} sm={12} lg={8} key={item._id}>
                  <Card
                    hoverable
                    onClick={() => handleSelectShowtime(item._id)}
                    style={{
                      cursor: 'pointer',
                      border: active
                        ? '2px solid #1677ff'
                        : '1px solid #e8e8e8',
                      background: active ? '#f0f5ff' : '#fff',
                      borderRadius: 12,
                    }}
                    styles={{ body: { padding: 16 } }}
                  >
                    <Space direction="vertical" size={5} style={{ width: '100%' }}>
                      <Text strong style={{ fontSize: 20 }}>
                        {formatTime(item.startTime)}
                      </Text>

                      <Text type="secondary">
                        {formatDate(item.startTime)}
                      </Text>

                      <Text>
                        Phòng: {getName(item.room)}
                      </Text>

                      <Text>
                        Rạp: {getName(item.theater)}
                      </Text>

                      <Text strong style={{ color: '#1677ff' }}>
                        {formatMoney(item.finalPrice ?? item.price ?? 0)}
                      </Text>

                      {active && (
                        <Tag color="blue" icon={<CheckCircleOutlined />}>
                          Đang chọn
                        </Tag>
                      )}
                    </Space>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </Card>

      {/* Bước 3 - Sơ đồ ghế */}
      <Card
        title={
          <Space>
            <span
              style={{
                background: '#1677ff',
                color: '#fff',
                borderRadius: 20,
                width: 26,
                height: 26,
                display: 'inline-flex',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              3
            </span>
            Chọn ghế
          </Space>
        }
        style={{ borderRadius: 14, marginBottom: 20 }}
        extra={
          selectedShowtimeId ? (
            <Button
              icon={<ReloadOutlined />}
              onClick={refreshSeatMap}
              loading={loadingSeats}
            >
              Cập nhật ghế
            </Button>
          ) : null
        }
      >
        {!selectedShowtimeId ? (
          <Empty description="Vui lòng chọn suất chiếu để xem sơ đồ ghế" />
        ) : loadingSeats ? (
          <div style={{ padding: 60, textAlign: 'center' }}>
            <Spin size="large" />
            <div style={{ marginTop: 12 }}>Đang tải sơ đồ ghế...</div>
          </div>
        ) : !seatMap ? (
          <Empty description="Không có dữ liệu sơ đồ ghế" />
        ) : (
          <>
            {/* Thông tin phim */}
            <div
              style={{
                padding: 16,
                background: '#fafafa',
                borderRadius: 10,
                marginBottom: 20,
              }}
            >
              <Row gutter={[16, 8]}>
                <Col xs={24} md={12}>
                  <Text strong>{getMovieTitle(seatMap.showtime.movie)}</Text>
                  <div>
                    {getName(seatMap.showtime.theater)} –{' '}
                    {getName(seatMap.showtime.room)}
                  </div>
                </Col>

                <Col xs={24} md={12}>
                  <Text>
                    <ClockCircleOutlined />{' '}
                    {formatTime(seatMap.showtime.startTime)} –{' '}
                    {formatTime(seatMap.showtime.endTime)}
                  </Text>
                  <div>
                    <Text type="secondary">
                      {formatDate(seatMap.showtime.startTime)}
                    </Text>
                  </div>
                </Col>
              </Row>
            </div>

            {/* Chú thích trạng thái */}
            <Space wrap style={{ marginBottom: 24 }}>
              <Tag color="blue">Ghế đang chọn</Tag>
              <Tag color="#e6f4ff">Ghế thường trống</Tag>
              <Tag color="gold">Ghế VIP trống</Tag>
              <Tag color="magenta">Ghế đôi trống</Tag>
              <Tag color="orange">Đang được giữ</Tag>
              <Tag color="#595959">Đã bán / Bảo trì</Tag>
            </Space>

            {/* Màn hình */}
            <div
              style={{
                maxWidth: 560,
                margin: '0 auto 32px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  height: 10,
                  borderRadius: '50%',
                  background:
                    'linear-gradient(90deg, transparent, #91caff, #1677ff, #91caff, transparent)',
                  boxShadow: '0 5px 18px rgba(22,119,255,0.18)',
                }}
              />

              <Text
                type="secondary"
                style={{
                  display: 'block',
                  marginTop: 12,
                  letterSpacing: 5,
                  fontSize: 12,
                }}
              >
                MÀN HÌNH
              </Text>
            </div>

            {/* Ghế */}
            <div style={{ overflowX: 'auto', paddingBottom: 12 }}>
              <div
                style={{
                  minWidth: Math.max(
                    500,
                    ...seatRows.map((row) => row.seats.length * 44),
                  ),
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                {seatRows.map(({ row, seats }) => (
                  <div
                    key={row}
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Text
                      strong
                      style={{
                        width: 26,
                        textAlign: 'center',
                        color: '#1677ff',
                      }}
                    >
                      {row}
                    </Text>

                    {seats.map((seat) => {
                      const selected = selectedSeats.includes(seat.code);
                      const disabled =
                        seat.status === 'booked' ||
                        (seat.status === 'locked' && !seat.isMine) ||
                        seat.physicalStatus === 'maintenance';

                      return (
                        <button
                          key={seat.code}
                          type="button"
                          disabled={disabled}
                          onClick={() => handleSeatClick(seat)}
                          title={`${seat.code} – ${formatMoney(seat.price)}${
                            seat.status === 'locked' && seat.isMine
                              ? ' – Ghế bạn đang giữ'
                              : ''
                          }`}
                          style={{
                            width: 38,
                            height: 36,
                            border: selected
                              ? '2px solid #0958d9'
                              : '1px solid rgba(0,0,0,0.08)',
                            borderRadius: seat.type === 'couple' ? 10 : 7,
                            background: seatColor(seat, selected),
                            color: seatTextColor(seat, selected),
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            opacity: disabled ? 0.85 : 1,
                            transition: 'all .15s ease',
                            flexShrink: 0,
                          }}
                        >
                          {seat.code}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Tổng tiền */}
            <Divider />

            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} md={12}>
                <Text type="secondary">Ghế đã chọn</Text>
                <Title level={4} style={{ margin: '4px 0' }}>
                  {selectedSeats.length > 0
                    ? selectedSeats.join(', ')
                    : 'Chưa chọn ghế'}
                </Title>
              </Col>

              <Col xs={24} md={12}>
                <Text type="secondary">Tổng tiền vé</Text>
                <Title
                  level={2}
                  style={{ margin: '4px 0', color: '#1677ff' }}
                >
                  {formatMoney(selectedTotal)}
                </Title>
              </Col>
            </Row>

            <div style={{ marginTop: 20 }}>
              <Button
                type="primary"
                size="large"
                icon={<ShoppingCartOutlined />}
                loading={locking}
                disabled={selectedSeats.length === 0}
                onClick={handleLockSeats}
                block
              >
                {lockResult ? 'Cập nhật giữ ghế' : 'Giữ ghế 5 phút'}
              </Button>
            </div>
          </>
        )}
      </Card>

      {/* Kết quả giữ ghế */}
      {lockResult && (
        <Card
          title={
            <Space>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              Giữ ghế thành công
            </Space>
          }
          style={{
            borderRadius: 14,
            marginBottom: 20,
            border: '1px solid #b7eb8f',
          }}
        >
          <Alert
            type="success"
            showIcon
            message="Ghế đã được giữ. Hoàn tất thanh toán trong thời gian giữ ghế."
            description={`Thời hạn giữ đến: ${new Date(
              lockResult.lockedUntil,
            ).toLocaleString('vi-VN')}`}
          />

          <Row gutter={[16, 16]} style={{ marginTop: 20 }}>
            <Col xs={24} md={12}>
              <Text type="secondary">Mã giữ vé</Text>
              <Title level={5} style={{ wordBreak: 'break-all' }}>
                {lockResult.ticketId}
              </Title>
            </Col>

            <Col xs={24} md={12}>
              <Text type="secondary">Ghế đang giữ</Text>
              <Title level={5}>{lockResult.seats.join(', ')}</Title>
            </Col>

            <Col xs={24} md={12}>
              <Text type="secondary">Tổng tiền cần thanh toán</Text>
              <Title level={3} style={{ color: '#1677ff', marginTop: 4 }}>
                {formatMoney(lockResult.totalAmount)}
              </Title>
            </Col>
          </Row>

          <Divider />

          <Space wrap>
            <Button
              danger
              onClick={handleReleaseSeats}
            >
              Hủy giữ ghế
            </Button>

            <Button
              icon={<ReloadOutlined />}
              onClick={refreshSeatMap}
            >
              Kiểm tra lại sơ đồ
            </Button>
          </Space>
        </Card>
      )}
    </div>
  );
};

export default StaffSales;