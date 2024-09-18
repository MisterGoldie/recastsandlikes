/** @jsxImportSource frog/jsx */
import { Button, Frog } from 'frog'
import { handle } from 'frog/vercel'
import { neynar } from 'frog/middlewares'

const app = new Frog({
  basePath: '/api',
  imageOptions: { width: 1200, height: 630 },
  title: 'Frame Interaction Checker',
}).use(
  neynar({
    apiKey: 'NEYNAR_FROG_FM',
    features: ['interactor', 'cast'],
  })
)

const AIRSTACK_API_URL = 'https://api.airstack.xyz/gql'
const AIRSTACK_API_KEY = '103ba30da492d4a7e89e7026a6d3a234e'
const BACKGROUND_IMAGE = 'https://bafybeig776f35t7q6fybqfe4zup2kmiqychy4rcdncjjl5emahho6rqt6i.ipfs.w3s.link/Thumbnail%20(31).png'

interface CastInfo {
  castedAtTimestamp: string;
  text: string;
  numberOfRecasts: number;
  numberOfLikes: number;
  hasRecasted: boolean;
}

async function checkRecastStatus(castHash: string, fid: string): Promise<CastInfo | null> {
  const query = `
    query CheckRecast($hash: String!, $fid: String!) {
      FarcasterReactions(
        input: {
          filter: {
            criteria: {_eq: recasted},
            hash: {_eq: $hash},
            reactedBy: {_eq: $fid}
          },
          blockchain: ALL
        }
      ) {
        Reaction {
          cast {
            hash
            timestamp
            text
            reactions {
              count
              reactionType
            }
          }
        }
      }
    }
  `

  const variables = {
    hash: castHash,
    fid: `fc_fid:${fid}`
  }

  try {
    console.log('Sending request to Airstack API with query:', query);
    console.log('Variables:', JSON.stringify(variables, null, 2));

    const response = await fetch(AIRSTACK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': AIRSTACK_API_KEY,
      },
      body: JSON.stringify({ query, variables }),
    })

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`HTTP error! status: ${response.status}, body:`, errorBody);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Airstack API Response:', JSON.stringify(data, null, 2));

    const reactions = data?.data?.FarcasterReactions?.Reaction;
    if (reactions && reactions.length > 0) {
      const cast = reactions[0].cast;
      if (cast) {
        const numberOfRecasts = cast.reactions.find((r: any) => r.reactionType === 'RECAST')?.count || 0;
        const numberOfLikes = cast.reactions.find((r: any) => r.reactionType === 'LIKE')?.count || 0;
        return {
          castedAtTimestamp: cast.timestamp || '',
          text: cast.text || '',
          numberOfRecasts,
          numberOfLikes,
          hasRecasted: true
        };
      }
    }

    // If no reaction found, fetch the cast info separately
    const castInfoQuery = `
      query GetCastInfo($hash: String!) {
        FarcasterCasts(
          input: {filter: {hash: {_eq: $hash}}, blockchain: ALL}
        ) {
          Cast {
            hash
            timestamp
            text
            reactions {
              count
              reactionType
            }
          }
        }
      }
    `
    
    const castInfoVariables = { hash: castHash };

    console.log('Sending request to Airstack API for cast info with query:', castInfoQuery);
    console.log('Variables:', JSON.stringify(castInfoVariables, null, 2));

    const castInfoResponse = await fetch(AIRSTACK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': AIRSTACK_API_KEY,
      },
      body: JSON.stringify({ query: castInfoQuery, variables: castInfoVariables }),
    })

    if (!castInfoResponse.ok) {
      const errorBody = await castInfoResponse.text();
      console.error(`HTTP error in cast info request! status: ${castInfoResponse.status}, body:`, errorBody);
      throw new Error(`HTTP error in cast info request! status: ${castInfoResponse.status}`);
    }

    const castInfoData = await castInfoResponse.json();
    console.log('Cast Info Response:', JSON.stringify(castInfoData, null, 2));

    const castInfo = castInfoData?.data?.FarcasterCasts?.Cast?.[0];
    if (castInfo) {
      const numberOfRecasts = castInfo.reactions.find((r: any) => r.reactionType === 'RECAST')?.count || 0;
      const numberOfLikes = castInfo.reactions.find((r: any) => r.reactionType === 'LIKE')?.count || 0;
      return {
        castedAtTimestamp: castInfo.timestamp || '',
        text: castInfo.text || '',
        numberOfRecasts,
        numberOfLikes,
        hasRecasted: false
      };
    }

    console.log('No cast info found');
    return null;
  } catch (error) {
    console.error('Error checking recast status:', error);
    return null;
  }
}

app.frame('/', (c) => {
  return c.res({
    image: (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        width: '100%', 
        height: '100%', 
        backgroundImage: `url(${BACKGROUND_IMAGE})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        fontFamily: 'Arial, sans-serif'
      }}>
        <h1 style={{ fontSize: '48px', color: 'white', marginBottom: '20px', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>Frame Interaction Checker</h1>
        <p style={{ fontSize: '24px', color: 'white', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>Check your interaction with a specific cast</p>
      </div>
    ),
    intents: [
      <Button action="/check-interaction">Check Interaction</Button>
    ],
  })
})

app.frame('/check-interaction', async (c) => {
  const { fid } = c.frameData ?? {}
  const castHash = '0x4d5f904518bb9e8368eb560d1b93c762f7267cb4' // Example cast hash

  if (!fid) {
    return c.res({
      image: (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          width: '100%', 
          height: '100%', 
          backgroundImage: `url(${BACKGROUND_IMAGE})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          fontFamily: 'Arial, sans-serif'
        }}>
          <h1 style={{ fontSize: '48px', color: 'white', marginBottom: '20px', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>Error</h1>
          <p style={{ fontSize: '24px', color: 'white', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>Unable to retrieve user information</p>
        </div>
      ),
      intents: [
        <Button action="/">Back to Home</Button>
      ],
    })
  }

  try {
    console.log('Checking recast status for FID:', fid, 'and castHash:', castHash);
    const castInfo = await checkRecastStatus(castHash, fid.toString())

    if (!castInfo) {
      return c.res({
        image: (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: '100%', 
            height: '100%', 
            backgroundImage: `url(${BACKGROUND_IMAGE})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            fontFamily: 'Arial, sans-serif'
          }}>
            <h1 style={{ fontSize: '48px', color: 'white', marginBottom: '20px', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>Cast Not Found</h1>
            <p style={{ fontSize: '24px', color: 'white', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>Unable to find information for this cast</p>
          </div>
        ),
        intents: [
          <Button action="/">Back to Home</Button>,
          <Button action="/check-interaction">Try Again</Button>
        ],
      })
    }

    console.log('Cast info retrieved:', JSON.stringify(castInfo, null, 2));

    return c.res({
      image: (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          width: '100%', 
          height: '100%', 
          backgroundImage: `url(${BACKGROUND_IMAGE})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          fontFamily: 'Arial, sans-serif'
        }}>
          <h1 style={{ fontSize: '36px', color: 'white', marginBottom: '20px', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>Cast Interaction Status</h1>
          <p style={{ fontSize: '24px', color: 'white', marginBottom: '10px', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>Recasts: {castInfo.numberOfRecasts}</p>
          <p style={{ fontSize: '24px', color: 'white', marginBottom: '10px', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>Likes: {castInfo.numberOfLikes}</p>
          <p style={{ fontSize: '24px', color: 'white', marginBottom: '20px', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>
            You have {castInfo.hasRecasted ? 'recasted' : 'not recasted'} this cast
          </p>
          <p style={{ fontSize: '18px', color: 'white', textAlign: 'center', maxWidth: '80%', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>{castInfo.text}</p>
        </div>
      ),
      intents: [
        ...(!castInfo.hasRecasted ? [<Button action="/recast">Recast</Button>] : []),
        <Button action="/like">Like</Button>,
        <Button action="/">Back to Home</Button>
      ],
    })
  } catch (error) {
    console.error('Error in /check-interaction:', error);
    return c.res({
      image: (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          width: '100%', 
          height: '100%', 
          backgroundImage: `url(${BACKGROUND_IMAGE})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          fontFamily: 'Arial, sans-serif'
        }}>
          <h1 style={{ fontSize: '48px', color: 'white', marginBottom: '20px', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>Error</h1>
          <p style={{ fontSize: '24px', color: 'white', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>An error occurred while checking the interaction. Please try again later.</p>
        </div>
      ),
      intents: [
        <Button action="/">Back to Home</Button>,
        <Button action="/check-interaction">Try Again</Button>
      ],
    })
  }
})

app.frame('/recast', (c) => {
  return c.res({
    image: (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        width: '100%', 
        height: '100%', 
        backgroundImage: `url(${BACKGROUND_IMAGE})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        fontFamily: 'Arial, sans-serif'
      }}>
        <h1 style={{ fontSize: '48px', color: 'white', marginBottom: '20px', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>Recasted!</h1>
        <p style={{ fontSize: '24px', color: 'white', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>You recasted the frame. This action would be recorded on Farcaster.</p>
      </div>
    ),
    intents: [
      <Button action="/check-interaction">Check Again</Button>,
      <Button action="/">Back to Home</Button>
    ],
  })
})

app.frame('/like', (c) => {
  return c.res({
    image: (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        justifyContent: 'center', 
        width: '100%', 
        height: '100%', 
        backgroundImage: `url(${BACKGROUND_IMAGE})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        fontFamily: 'Arial, sans-serif'
      }}>
        <h1 style={{ fontSize: '48px', color: 'white', marginBottom: '20px', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>Liked!</h1>
        <p style={{ fontSize: '24px', color: 'white', textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}>You liked the frame. This action would be recorded on Farcaster.</p>
      </div>
    ),
    intents: [
      <Button action="/check-interaction">Check Again</Button>,
      <Button action="/">Back to Home</Button>
    ],
  })
})

export const GET = handle(app)
export const POST = handle(app)