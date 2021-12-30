import React, { Component } from 'react';
import Client from "../helpers/matrix_client";
import { RingLoader } from 'react-spinners';
import { ImageEvent, ImageGalleryEvent } from '../helpers/event_types';
import Link from 'next/link';
import Head from 'next/head';

type ImageEvents = ImageEvent | ImageGalleryEvent;

type Props = {
    client: Client | undefined;
};

type State = {
    directory_data: { _id: string; user_id: string; user_room: string; }[];
    viewingUserId?: string;
    error?: any;
    directoryIsLoaded: boolean;
    isLoadingImages: boolean;
    hasFullyLoaded: boolean;
    // TODO make sure we parse both extev variants properly
    image_events: ImageEvents[] | [];
};

const centerSpinner = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
`;

const constMatrixArtServer = process.env.NEXT_PUBLIC_DEFAULT_SERVER_URL;

export default class Home extends Component<Props, State>{
    constructor(props: Props) {
        super(props);

        this.state = {
            viewingUserId: this.props.client?.userId,
            isLoadingImages: false,
            directoryIsLoaded: false,
            hasFullyLoaded: false,
            image_events: []
        } as State;
    }

    async componentDidUpdate() {
        await this.loadEvents();
    }

    componentDidMount() {
        // auto-register as a guest if not logged in
        if (typeof window !== "undefined") {
            // Client-side-only code
            if (!this.props.client?.accessToken) {
                this.registerAsGuest();
            } else {
                console.log("Already logged in");
                fetch('/api/directory')
                    .then((res) => res.json())
                    .then(
                        (data) => this.setState({ directory_data: data.data, directoryIsLoaded: true }),
                        // Note: it's important to handle errors here
                        // instead of a catch() block so that we don't swallow
                        // exceptions from actual bugs in components.
                        (error) => {
                            this.setState({
                                hasFullyLoaded: true,
                                error
                            });
                        }
                    );
            }
        }

    }

    async registerAsGuest() {
        try {
            let serverUrl = constMatrixArtServer + "/_matrix/client";
            await this.props.client?.registerAsGuest(serverUrl);
            window.location.reload();
        } catch (err) {
            console.error("Failed to register as guest:", err);
            this.setState({
                error: "Failed to register as guest: " + JSON.stringify(err),
            });
        }
    }
    async loadEvents() {
        const { directoryIsLoaded, directory_data, isLoadingImages, hasFullyLoaded } = this.state;
        if (!directoryIsLoaded || isLoadingImages || hasFullyLoaded) {
            return;
        }
        this.setState({
            isLoadingImages: true,
        });
        try {
            for (let user of directory_data) {
                // We dont need many events
                const roomId = await this.props.client?.followUser(user.user_room);
                await this.props.client?.getTimeline(roomId, 100, (events) => {
                    // Filter events by type
                    const image_events = events.filter((event) => event.type == "m.image_gallery" || event.type == "m.image");
                    console.log("Adding ", image_events.length, " items");
                    this.setState({
                        image_events: [...this.state.image_events, ...image_events],
                    });
                });
            }
        } catch (err) {
            this.setState({
                error: JSON.stringify(err),
            });
        } finally {
            this.setState({
                hasFullyLoaded: true,
                isLoadingImages: false
            });
        }
    }

    render() {
        const { error, hasFullyLoaded, image_events } = this.state;

        if (error) {
            return (
                <div>Error: {error.message}</div>
            );
        } else if (!hasFullyLoaded) {
            return (
                <div className="flex h-screen">
                    <div className="m-auto">
                        <RingLoader css={centerSpinner} size={150} color={"#123abc"} loading={!hasFullyLoaded} />
                    </div>
                </div>
            );
        } else {
            return (
                <>
                    <Head>
                        <title key="title">Matrix Art | Home</title>
                    </Head>
                    <header className='flex fixed top-0 left-0 right-0 bottom-0 lg:h-[108px] h-[216px] z-[100] items-center lg:flex-row flex-col'>
                        <span className='flex items-center h-full lg:mx-10 my-4 text-gray-900 dark:text-gray-200 font-bold'><Link href="/">Matrix Art</Link></span>
                        <div className='flex flex-1 items-center lg:flex-row flex-col'>
                            <div className='flex grow-[1] h-full relative items-center'>
                                <form className='w-[200px] text-gray-900 dark:text-gray-200'>
                                    <div className='flex flex-row box-border items-center cursor-text duration-300 rounded-sm border dark:border-slate-400 border-slate-500 py-1.5 px-2 focus-within:border-teal-400'>
                                        <input className='bg-transparent min-w-[20px] focus:outline-none flex-[1]' type="text" placeholder='Search & Discover' />
                                        <span className='inline-flex items-center justify-center cursor-pointer'>
                                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" className='fill-gray-900 dark:fill-gray-200'><path d="M0 0h24v24H0z" fill="none" /><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" /></svg>
                                        </span>
                                    </div>
                                </form>
                            </div>

                            <nav className='flex flex-shrink-0 relative mr-0 h-full'>
                                <span className='px-4 h-auto min-w-[24px] flex items-center whitespace-nowrap cursor-pointer text-gray-900 dark:text-gray-200 font-medium'><Link href="/register">Join</Link></span>
                                <span className='px-4 h-auto min-w-[24px] flex items-center whitespace-nowrap cursor-pointer text-gray-900 dark:text-gray-200 font-medium'><Link href="/login">Log in</Link></span>
                            </nav>
                        </div>
                        <span className='lg:opacity-100 opacity-0 inline-block bg-gray-900 dark:bg-gray-200 w-[1px] h-[27px]'></span>
                        <div className='relative lg:m-0 mt-4'>
                            <div className='flex'>
                                <button className='text-teal-400 bg-transparent relative h-[54px] min-w-[150px] z-[2] cursor-auto font-semibold'>Submit</button>
                            </div>
                        </div>
                    </header>
                    <main className='lg:pt-[108px] pt-[216px] z-0'>
                        <div className='z-[100] sticky lg:top-[108px] top-[216px] bg-[#fefefe]/[.95] dark:bg-[#14181E]/[.95]'>
                            <div className='h-[72px] px-10 w-full relative grid grid-cols-[1fr_auto_1fr] items-center' id='section-grid'>
                                <h1 className='text-xl text-gray-900 dark:text-gray-200 font-bold'>Home</h1>
                            </div>
                        </div>
                        <div className='m-10'>
                            <ul className='flex flex-wrap gap-1'>
                                {image_events.map(event => isImageGalleryEvent(event) ? this.render_gallery(event) : isImageEvent(event) ? this.render_image(event) : <></>)}
                                <li className='flex-grow-10'></li>
                            </ul>
                        </div>

                    </main>
                    <footer></footer>
                </>
            );
        };
    }



    render_gallery(event: ImageGalleryEvent) {
        const caption = event.content['m.caption'].filter((cap) => {
            const possible_html_caption = (cap as { body: string; mimetype: string; });
            return possible_html_caption.body !== undefined && possible_html_caption.mimetype === "text/html";
        });
        let caption_text = "";
        if (caption.length != 0) {
            caption_text = (caption[0] as { body: string; mimetype: string; }).body;
        }
        return event.content['m.image_gallery'].map(image => {
            return this.render_image_box(image['m.thumbnail'][0].url, event.event_id + image['m.file'].url, event.event_id, event.sender, caption_text);
        });
    }


    render_image(event: ImageEvent) {
        const caption = event.content['m.caption'].filter((cap) => {
            const possible_html_caption = (cap as { body: string; mimetype: string; });
            return possible_html_caption.body !== undefined && possible_html_caption.mimetype === "text/html";
        });
        let caption_text = "";
        if (caption.length != 0) {
            caption_text = (caption[0] as { body: string; mimetype: string; }).body;
        }
        return this.render_image_box(event.content['m.thumbnail'][0].url, event.event_id, event.event_id, event.sender, caption_text);
    }

    render_image_box(thumbnail_url: string, id: string, post_id: string, sender: string, caption: string) {
        // TODO show creators display name instead of mxid and show avatar image
        const direct_link = `/post/${id}`;
        return (
            <li className='flex-grow-1 h-[270px]' key={post_id}>
                <Link href={direct_link}>
                    <div className='relative h-[270px] cursor-pointer'>
                        <img className='relative max-w-full h-[270px] object-cover align-bottom z-0' src={this.props.client?.thumbnailLink(thumbnail_url, "scale", 270, 270)}></img>
                        <div className="flex-col max-w-full h-[270px] object-cover opacity-0 hover:opacity-100 duration-300 absolute bg-gradient-to-b from-transparent to-black/[.25] inset-0 z-10 flex justify-end items-start text-white p-4">
                            <h2 className='truncate max-w-full text-base font-semibold'>{caption}</h2>
                            <p className='truncate max-w-full text-sm'>{sender}</p>
                        </div>
                    </div>
                </Link>
            </li>
        );
    }

}

// TODO also render the edits properly later on
function isImageGalleryEvent(event: ImageEvents): event is ImageGalleryEvent {
    return event.type === "m.image_gallery" && event.redacted_because === undefined;
}


function isImageEvent(event: ImageEvents): event is ImageEvent {
    return event.type === "m.image" && event.redacted_because === undefined;
}