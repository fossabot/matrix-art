import Link from "next/link";
import { PureComponent } from "react";
import { Blurhash } from "react-blurhash";
import { ImageEvent, ImageGalleryEvent, MatrixEventBase, MatrixImageEvents } from "../helpers/event_types";
import { constMatrixArtServer } from "../helpers/matrix_client";
import { ClientContext } from "./ClientContext";

type Props = {
    event: MatrixImageEvents;
    imageHeight?: string;
};

type State = {
    displayname: string;
    imageHeight?: string;
    error: any;
};

export default class FrontPageImage extends PureComponent<Props, State> {
    declare context: React.ContextType<typeof ClientContext>;

    constructor(props: Props) {
        super(props);

        this.state = {
            displayname: this.props.event.sender,
            imageHeight: this.props.imageHeight ? this.props.imageHeight : "270px"
        } as State;
    }

    async componentDidMount() {
        // auto-register as a guest if not logged in
        if (!this.context.client?.accessToken) {
            this.registerAsGuest();
        } else {
            console.log("Already logged in");
            if (!this.props.event) {
                return;
            }
            try {
                const profile = await this.context.client.getProfile(this.props.event.sender);
                this.setState({
                    displayname: profile.displayname,
                });
            } catch (error) {
                console.debug(`Failed to fetch profile for user ${this.props.event.sender}:`, error);
            }
        }

    }

    async registerAsGuest() {
        try {
            let serverUrl = constMatrixArtServer + "/_matrix/client";
            await this.context.client?.registerAsGuest(serverUrl);
            if (typeof window !== "undefined") {
                window.location.reload();
            }
        } catch (error) {
            console.error("Failed to register as guest:", error);
            this.setState({
                error: "Failed to register as guest: " + JSON.stringify(error),
            });
        }
    }

    render() {
        const event = this.props.event;
        return (
            <>
                {isImageGalleryEvent(event) ? this.render_gallery(event) : (isImageEvent(event) ? this.render_image(event) : <div key={(event as MatrixEventBase).event_id}></div>)}
            </>
        );
    }


    render_gallery(event: ImageGalleryEvent) {
        const caption = event.content['m.caption'].filter((cap) => {
            const possible_html_caption = (cap as { body: string; mimetype: string; });
            return possible_html_caption.body !== undefined && possible_html_caption.mimetype === "text/html";
        });
        let caption_text = "";
        if (caption.length > 0) {
            caption_text = (caption[0] as { body: string; mimetype: string; }).body;
        }
        return event.content['m.image_gallery'].map(image => {
            return this.render_image_box(image['m.thumbnail'][0].url, event.event_id + image['m.file'].url, event.event_id, caption_text, image['m.image'].height, image['m.image'].width, image["xyz.amorgan.blurhash"]);
        });
    }


    render_image(event: ImageEvent) {
        const caption = event.content['m.caption'].filter((cap) => {
            const possible_html_caption = (cap as { body: string; mimetype: string; });
            return possible_html_caption.body !== undefined && possible_html_caption.mimetype === "text/html";
        });
        let caption_text = "";
        if (caption.length > 0) {
            caption_text = (caption[0] as { body: string; mimetype: string; }).body;
        }
        return this.render_image_box(event.content['m.thumbnail'][0].url, event.event_id, event.event_id, caption_text, event.content['m.image'].height, event.content['m.image'].width, event.content["xyz.amorgan.blurhash"]);
    }

    render_image_box(thumbnail_url: string, id: string, post_id: string, caption: string, h: number, w: number, blurhash?: string) {
        // TODO show creators display name instead of mxid and show avatar image
        // TODO proper alt text
        const direct_link = `/post/${encodeURIComponent(post_id)}`;
        const image = blurhash ? (
            <div className="flex">
                <Blurhash
                    hash={blurhash}
                    height={this.state.imageHeight}
                    width="100%"
                />
                <img loading="lazy" width={w} height={h} alt={caption} title={caption} style={{ height: this.state.imageHeight }} className="h-auto w-full relative -ml-[100%] max-w-full object-cover align-bottom" src={this.context.client?.thumbnailLink(thumbnail_url, "scale", Number.parseInt(this.state.imageHeight?.replace("px", "")!), Number.parseInt(this.state.imageHeight?.replace("px", "")!))}></img>
            </div>
        ) : (
            <img alt={caption} width={w} height={h} title={caption} style={{ height: this.state.imageHeight }} className={`h-auto w-full relative max-w-full object-cover align-bottom z-0`} src={this.context.client?.thumbnailLink(thumbnail_url, "scale", Number.parseInt(this.state.imageHeight?.replace("px", "")!), Number.parseInt(this.state.imageHeight?.replace("px", "")!))}></img>
        );
        return (
            <li style={{ height: this.state.imageHeight }} key={id}>
                <Link href={direct_link} passHref>
                    <div style={{ height: this.state.imageHeight }} className={`relative cursor-pointer`}>
                        {image}
                        <div style={{ height: this.state.imageHeight }} className={`flex-col max-w-full opacity-0 hover:opacity-100 duration-300 absolute bg-gradient-to-b from-transparent to-black/[.25] inset-0 z-10 flex justify-end items-start text-white p-4`}>
                            <h2 className='truncate max-w-full text-base font-semibold'>{caption}</h2>
                            <p className='truncate max-w-full text-sm'>{this.state.displayname}</p>
                        </div>
                    </div>
                </Link>
            </li>
        );
    }
}
FrontPageImage.contextType = ClientContext;

// TODO also render the edits properly later on
export function isImageGalleryEvent(event: MatrixImageEvents): event is ImageGalleryEvent {
    return event.type === "m.image_gallery" && event.redacted_because === undefined;
}


export function isImageEvent(event: MatrixImageEvents): event is ImageEvent {
    return event.type === "m.image" && event.redacted_because === undefined;
};