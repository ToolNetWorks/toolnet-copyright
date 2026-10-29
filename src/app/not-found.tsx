import Link from 'next/link';
export default function NotFound() { return <main className="notfound"><p className="kicker">404 / NOT FOUND</p><h1>Không tìm thấy tác phẩm.</h1><p>Nội dung có thể chưa được công bố hoặc địa chỉ không hợp lệ.</p><Link className="btn" href="/registry">Quay lại kho tác phẩm</Link></main>; }
