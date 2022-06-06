import ReactDOM from "react-dom";
import React, {FC, Suspense, useEffect, useState} from "react";
import {nanoid} from "nanoid";
import {useDebounce, useLocalStorage} from "react-use";
import {LinkIcon, PlayIcon} from "@heroicons/react/solid";
import Fuse from "fuse.js"
import {filter, isEqual, uniqBy, uniqWith} from "lodash";
import Base64url from "crypto-js/enc-base64url";
import sha256 from "crypto-js/sha256";
import PlaylistObjectSimplified = SpotifyApi.PlaylistObjectSimplified;
import PlaylistTrackObject = SpotifyApi.PlaylistTrackObject;
import ListOfCurrentUsersPlaylistsResponse = SpotifyApi.ListOfCurrentUsersPlaylistsResponse;
import PlaylistTrackResponse = SpotifyApi.PlaylistTrackResponse;

const ORIGIN = new URL(document.location.href).origin

const App: FC = () => {
    const [triggerRefresh, setTriggerRefresh] = useState(0)
    const [verifier] = useLocalStorage("verifier", nanoid(100))
    const [accessToken, setAccessToken, removeAccessToken] = useLocalStorage("accessToken", "")

    const doAuth = async () => {
        if (!verifier) {
            return;
        }
        const challenge = Base64url.stringify(sha256(verifier))
        const url = new URL("https://accounts.spotify.com/authorize")
        url.search = (new URLSearchParams([
            ["client_id", "af0b9b5ccdd345c1bbae76a693a94af1"],
            ["response_type", "code"],
            ["redirect_uri", `${ORIGIN}/items/sibdee?callback`],
            ["code_challenge_method", "S256"],
            ["code_challenge", challenge],
            ["scope", "user-library-read"]
        ])).toString()
        document.location = url.toString()
    }

    const receiveCallback = async () => {
        const urlParams = new URLSearchParams(document.location.search)
        const isCallback = urlParams.get("callback") !== null
        if (!isCallback) {
            return
        }
        const callbackError = urlParams.get("error")
        if (callbackError) {
            console.log("callback error", callbackError)
            return
        }
        const authCode = urlParams.get("code")
        if (!authCode) {
            console.log("no auth code")
            return
        }
        if (!verifier) {
            console.log("no verifier")
            return
        }
        const resp = await fetch("https://accounts.spotify.com/api/token", {
            method: "post",
            body: new URLSearchParams({
                grant_type: "authorization_code",
                code: authCode,
                redirect_uri: `${ORIGIN}/items/sibdee?callback`,
                client_id: "af0b9b5ccdd345c1bbae76a693a94af1",
                code_verifier: verifier
            })
        })
        const respBody = await resp.json()
        if (respBody.error) {
            console.log("response error", respBody.error, respBody.error_description)
            return
        }
        if (respBody.scope !== "user-library-read") {
            console.log("resp wrong scope")
            return
        }
        const newAccessToken = respBody["access_token"]
        if (!newAccessToken) {
            console.log("resp had no access token")
            return
        }
        console.log("got access token!", newAccessToken)
        setAccessToken(newAccessToken)
        document.location.search = ""
    }

    useEffect(() => {
        receiveCallback().catch(console.error)
    }, [])

    if (!accessToken) {
        return (
            <div className="flex items-center justify-center w-screen h-screen font-mono">
                <button className="p-4 text-white bg-bg3 hover:bg-bg4 focus:outline-black"
                        onClick={doAuth}>
                    Authorize
                </button>
            </div>
        )
    }

    return <div className="flex flex-col justify-start items-stretch w-screen h-screen p-4 font-mono">
        <SearchScreen
            accessToken={accessToken}
            onAuthFailed={() => {
                removeAccessToken()
                setTriggerRefresh(triggerRefresh + 1)
            }}/>
    </div>
}

interface SearchScreenProps {
    accessToken: string
    onAuthFailed: () => void;
}

const SearchScreen: FC<SearchScreenProps> = props => {
    const [searchQuery, setSearchQuery] = useState("")
    const [allPlaylistTracks, setAllPlaylistTracks] = useState<[PlaylistObjectSimplified, PlaylistTrackObject[]][]>([])
    const [processedPlaylistTracks, setProcessedPlaylistTracks] = useState<[PlaylistObjectSimplified, PlaylistTrackObject[]][]>([]);
    const [playlistTracksLoading, setPlaylistTracksLoading] = useState(true)

    // Gets all the user"s playlists
    useEffect(() => {
        const asyncFn = async () => {
            const url = new URL("https://api.spotify.com/v1/me/playlists");
            url.search = (new URLSearchParams([
                ["limit", "50"],
            ])).toString()
            const resp = await fetch(url.toString(), {headers: {"Authorization": `Bearer ${props.accessToken}`}})
            if (!resp.ok) {
                props.onAuthFailed()
                return
            }
            const data = (await resp.json()) as ListOfCurrentUsersPlaylistsResponse;

            const newAllPlaylistTracks: [PlaylistObjectSimplified, PlaylistTrackObject[]][] = []
            for (const playlist of data.items) {
                const playlistTracks: PlaylistTrackObject[] = []
                newAllPlaylistTracks.push([playlist, playlistTracks])
                const url = new URL(playlist.tracks.href)
                let total = 0;
                do {
                    url.search = new URLSearchParams([
                        ["limit", "50"],
                        ["offset", playlistTracks.length.toString()]
                    ]).toString()
                    const resp = await fetch(url.toString(), {headers: {"Authorization": `Bearer ${props.accessToken}`}})
                    if (!resp.ok) {
                        props.onAuthFailed()
                        return
                    }
                    const data = (await resp.json()) as PlaylistTrackResponse;
                    total = data.total
                    playlistTracks.push(...data.items)
                    setAllPlaylistTracks([...newAllPlaylistTracks])
                } while (total > playlistTracks.length)
            }
            setPlaylistTracksLoading(false)
        }
        asyncFn().catch(console.error)
    }, [])

    // Processes search queries when the user types
    useDebounce(() => {
        if (!searchQuery) {
            setProcessedPlaylistTracks([])
            return;
        }
        const allTracks = allPlaylistTracks.flatMap(([p, ts]) => ts).map(t => t.track)
        const fuse = new Fuse(allTracks, {
            includeMatches: true,
            includeScore: true,
            isCaseSensitive: false,
            keys: ["artists.name", "title"],
        })
        const searchResults = fuse.search(searchQuery).slice(0, 100)

        let playlistTracks: [PlaylistObjectSimplified, PlaylistTrackObject[]][] = [];
        for (const result of searchResults) {
            for (const [p, ts] of allPlaylistTracks) {
                const tsFiltered = filter(ts, {track: {id: result.item.id}})
                if (!tsFiltered.length) {
                    continue
                }
                if (!playlistTracks.includes([p, tsFiltered])) {
                    playlistTracks.push([p, tsFiltered])
                }
            }
        }
        playlistTracks = uniqWith(playlistTracks, isEqual)
        const playlistTracksCollapsed: [PlaylistObjectSimplified, PlaylistTrackObject[]][] = [];
        const playlistOrder = uniqBy(playlistTracks.map(([p]) => p), "id");
        for (const playlist of playlistOrder) {
            playlistTracksCollapsed.push([
                playlist,
                uniqWith(
                    playlistTracks.filter(([p]) => p.id == playlist.id).flatMap(([, ts]) => ts),
                    isEqual
                )
            ])
        }
        setProcessedPlaylistTracks(playlistTracksCollapsed)
    }, 200, [searchQuery])

    const playlistTracks = processedPlaylistTracks.length ? processedPlaylistTracks : allPlaylistTracks
    return (
        <>
            <div className="w-full h-10 p-4 border border-black flex justify-between items-center relative">
                <input type="search" name="search" id="search" placeholder="Search for tracks here"
                       className="flex-1 appearance-none bg-bg2 w-full text-fg1 outline-none"
                       onChange={e => setSearchQuery(e.target.value)}
                />
            </div>
            <div className="flex-1 mt-4 p-4 flex justify-center items-stretch border border-black overflow-hidden">
                <ol className="flex-1 flex flex-col whitespace-pre-wrap justify-start items-stretch overflow-y-scroll">
                    <li className="text-fg1 text-center underline sticky top-0 bg-bg2 pb-2 relative">
                        <span>
                            Results
                        </span>
                        {
                            playlistTracksLoading && (
                                <span className="text-fg2 text-center absolute right-0 bg-bg2 mr-2">
                                    Loading...
                                </span>
                            )
                        }
                    </li>
                    {
                        playlistTracks.map(([p, ts], idx) => {
                            return (
                                <li key={idx} className="flex-0 flex flex-col text-fg1 bg-bg3 mb-2 px-2">
                                    <div className="flex items-center">
                                        <a href={p.external_urls.spotify} className="flex-0">
                                            <LinkIcon className="h-4 w-4"/>
                                        </a>
                                        <span className="flex-0 pl-2">
                                        {p.name}{processedPlaylistTracks.length ? "" : ` (${ts.length} tracks)`}
                                        </span>
                                    </div>
                                    {
                                        !!processedPlaylistTracks.length && ts.map((t, idx) => (
                                            <div key={idx} className="flex items-center pl-4">
                                                <a href={t.track.external_urls.spotify} className="flex-0">
                                                    <PlayIcon className="h-4 w-4"/>
                                                </a>
                                                <span className="flex-0 pl-2">
                                                    {t.track.name} | {t.track.artists.map(a => a.name).join(", ")}
                                                </span>
                                            </div>
                                        ))
                                    }
                                </li>
                            )
                        })
                    }
                </ol>
            </div>
        </>
    )
}


ReactDOM.render(
    <React.StrictMode>
        <App/>
    </React.StrictMode>,
    document.getElementById("react-app")
);
