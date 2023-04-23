FROM gcc:bullseye as builder

ARG VERSION=21.1
WORKDIR /build
ADD https://github.com/nzbget-ng/nzbget/archive/refs/tags/v${VERSION}.tar.gz .

RUN tar -zxf v${VERSION}.tar.gz --strip-components 1 
RUN ./configure --disable-curses
RUN make

FROM gcr.io/gcr.io/distroless/base-debian11:nonroot
ENV CONFIG=/config/nzbget.conf
VOLUME ["/config", "/downloads"]
EXPOSE 6789
WORKDIR /nzbget
COPY --from=builder /build/nzbget /build/webui ./
COPY --from=builder /build/nzbget.config ./webui/nzbget.conf.template
CMD [ "nzbget", "-s", "-o", "outputmode=log", "-c", "${CONFIG}"]