import { NextResponse } from 'next/server';
import getCachedSession from '@ui/getCachedSession';
import { findSidekicksForChat } from '@utils/findSidekicksForChat';
import { respond401 } from '@utils/auth/respond401';

export async function GET(req: Request) {
  const session = await getCachedSession();

  const user = session?.user;
  if (!session?.user?.email) return respond401();
try{
  const sidekicks = await findSidekicksForChat(user);

    return NextResponse.json(sidekicks);
  } catch (error) {
   return respond401() }
}
