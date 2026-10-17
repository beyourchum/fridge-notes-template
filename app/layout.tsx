import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'冰箱小日子',description:'食材庫存、食譜與補貨清單。'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-Hant"><body>{children}</body></html>}
