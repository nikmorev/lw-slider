import './style.css'

type VoidFunction = (args?: any) => void
type DebounceTimeout = number

interface LwSliderOptions {
    slidesPerView: number
    scrollNumber: number
    infiniteScroll: boolean
    autoScroll: boolean
    scrollPeriod: number
}

function debounce(func: VoidFunction, timeout: DebounceTimeout): VoidFunction {
    let canCallFunction = true

    return function(args?: any) {
        if (!canCallFunction) return
        func(args)
        canCallFunction = false
        setTimeout(() => canCallFunction = true, timeout)
    }
}

export class LwSlider {

    public readonly slider: HTMLElement
    private readonly inner: HTMLElement
    private readonly slides: NodeListOf<HTMLElement> | []
    public readonly controls: HTMLButtonElement[] | []
    private readonly leftControl?: HTMLButtonElement | undefined
    private readonly rightControl?: HTMLButtonElement | undefined
    private contolDots?: HTMLButtonElement[] | []
    private options: LwSliderOptions
    private timerId: ReturnType<typeof setTimeout> | undefined

    private debounceTimeoutMiddle: number = 100 // ms
    // private debounceTimeoutShort: number = 10 // ms

    public setSlidesWidth = debounce(this._setSlidesWidth.bind(this), this.debounceTimeoutMiddle)
    public scrollLeft = debounce(this._scrollLeft.bind(this), this.debounceTimeoutMiddle)
    public scrollRight = debounce(this._scrollRight.bind(this), this.debounceTimeoutMiddle)
    public scrollToSlide = debounce(this._scrollToSlide.bind(this), this.debounceTimeoutMiddle)
    private handleControlOnEdge = debounce(this._handleControlOnEdge.bind(this), this.debounceTimeoutMiddle)

    constructor(
        public readonly sliderId: string,
        { 
            slidesPerView = 3,
            scrollNumber = 1,
            infiniteScroll = true,
            autoScroll = false,
            scrollPeriod = 3
        } = {}
    ) {
        if (!sliderId) throw new Error(`Please provide id to init slider`)
        
        this.slider = document.getElementById(sliderId) as HTMLElement
        if (!this.slider) throw new Error(`Couldn't finder slider with id: ${sliderId}`)
        
        this.inner = this.slider.querySelector('[data-lw-slider-inner]') as HTMLElement
        if (!this.inner) throw new Error(`Couldn't finder inner element of slider with id: ${sliderId}`)

        this.slides = this.slider.querySelectorAll('[data-lw-slider-slide]')
        
        this.controls = Array.from(document.querySelectorAll(`[data-lw-slider-c=${sliderId}]`)) as HTMLButtonElement[]

        if (this.controls.length) {
            this.leftControl = this.controls.find((control: HTMLButtonElement) => control.hasAttribute(`data-lw-slider-lc`))
            this.rightControl = this.controls.find((control: HTMLButtonElement) => control.hasAttribute(`data-lw-slider-rc`))
            this.contolDots = this.controls.filter((control: HTMLButtonElement) => control.hasAttribute(`data-lw-slider-cd`))
        }

        this.options = {
            slidesPerView,
            scrollNumber,
            infiniteScroll,
            autoScroll,
            scrollPeriod
        }
    }

    get slideElement() {
        return this.slides[0]
    }

    get innerWidth(): number {
        return this.inner.clientWidth
    }
    
    get slideWidth(): number {
        return this.slideElement.getBoundingClientRect().width
    }

    get innerScrollWidth(): number {
        return this.inner.scrollWidth
    }

    get slidesNumber(): number {
        return this.slides.length || 1
    }

    get gap(): number {
        return (this.innerScrollWidth - this.slidesNumber * this.slideWidth) / (this.slidesNumber - 1)
    }

    get isScrollBegin(): boolean {
        return this.inner.scrollLeft === 0
    }

    get isScrollEnd(): boolean {
        return (
            (this.inner.scrollWidth === this.inner.clientWidth + this.inner.scrollLeft) ||
            (this.inner.scrollWidth === this.inner.clientWidth)
        )
    }

    get scrollWidth(): number {
        const oneSlideScrollWidth = this.slideWidth + this.gap
        return oneSlideScrollWidth * this.options.scrollNumber
    }

    private _setSlidesWidth(): number {
        const potentialSlideWidth = (this.innerWidth - this.gap * (this.options.slidesPerView - 1)) / this.options.slidesPerView
        const minSlideWidth = parseInt(getComputedStyle(this.slideElement).minWidth)

        const slideWidth = Math.max(potentialSlideWidth, minSlideWidth)

        this.slides.forEach((slide: HTMLElement) => {
            slide.style.width = `${slideWidth}px`
            slide.style.flexBasis = `${slideWidth}px`
            slide.style.flexShrink = '0'
        })

        return slideWidth
    }

    private _handleControlOnEdge(): void {

        setTimeout(() => {
            console.log('cal')
            if (this.leftControl) this.leftControl.disabled = this.isScrollBegin
            if (this.rightControl) this.rightControl.disabled = this.isScrollEnd
        }, 500)
    }

    private _scrollLeft(): void {
        if (this.options.infiniteScroll) {
            if (this.isScrollBegin) this.inner.scroll({ left: this.inner.scrollWidth, behavior: 'smooth'})
            else this.inner.scrollBy({ left: -this.scrollWidth, behavior: 'smooth'})
        } else {
            this.inner.scrollBy({ left: -this.scrollWidth, behavior: 'smooth'})
            this.handleControlOnEdge()
        }
    }

    private _scrollRight(): void {
        if (this.options.infiniteScroll) {
            if (this.isScrollEnd) this.inner.scroll({ left: 0, behavior: 'smooth'})
            else this.inner.scrollBy({ left: this.scrollWidth, behavior: 'smooth'})
        } else {
            this.inner.scrollBy({ left: this.scrollWidth, behavior: 'smooth'})
            this.handleControlOnEdge()
        }
    }

    private _scrollToSlide(slideIndex: number): void {
        const scrollAmount = (this.slideWidth + this.gap) * slideIndex
        this.inner.scroll({ left: scrollAmount, behavior: 'smooth'})
    }

    private addEventListenerToControlDots(): void {
        if (!this.contolDots) return
        if (!this.contolDots.length) return

        this.slides.forEach((_, index: number) => {
            const dotButton = this.contolDots!.find((dot: HTMLButtonElement) => dot.dataset.lwSliderCd === String(index))
            if (!dotButton) return

            dotButton.addEventListener('click', () => this.scrollToSlide(index))
        })
    }

    public startAutoScroll(): void {
        this.timerId = setInterval(() => {
            if (this.isScrollEnd) this.inner.scroll({ left: 0, behavior: 'smooth'})
            else this.inner.scrollBy({ left: this.scrollWidth, behavior: 'smooth'})
        }, this.options.scrollPeriod * 1000)
    }
    
    public stopAutoScroll(): void {
        clearInterval(this.timerId)
    }

    public run(): void {
        this.setSlidesWidth()

        if (!this.options.infiniteScroll) {
            this.handleControlOnEdge()
            this.inner.addEventListener('scroll', this.handleControlOnEdge)
        }

        if (this.options.autoScroll) {
            this.startAutoScroll()
        }

        this.addEventListenerToControlDots()
        this.leftControl?.addEventListener('click', this.scrollLeft)
        this.rightControl?.addEventListener('click', this.scrollRight)

        window.addEventListener('resize', this.setSlidesWidth)
    }
}

const slider = new LwSlider('lw-slider', {
    slidesPerView: 2,
    infiniteScroll: true,
    scrollNumber: 1,
    autoScroll: false
})

slider.run()